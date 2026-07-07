"""VSM Ambassador PWA backend.

Endpoints (all under /api):
  POST /ambassador/apply             — signup + insert application (service role)
  GET  /ambassador/me                — current user profile + application + promo_codes
  POST /auth/resolve-identifier      — resolve email from email/phone/badge
  GET  /ambassador/status-stream     — long-poll for status changes (Pending→approved)
  GET  /push/public-key              — returns VAPID public key
  POST /push/subscribe               — store web-push subscription
  POST /push/test                    — send a test notification (auth required)

Tracking redirect (NOT under /api so the link is short):
  GET  /r/{slug}                     — record click + redirect to vsmcollection.com/?ref=slug

Push subscriptions are stored in the existing `settings` table using key
'push_sub_<user_id>_<endpoint_hash>' to avoid requiring DDL access.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, BackgroundTasks
from fastapi.responses import RedirectResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Any
import os
import json
import hashlib
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path
import httpx
from pywebpush import webpush, WebPushException

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_ANON_KEY = os.environ['SUPABASE_ANON_KEY']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '').replace('\\n', '\n')
VAPID_SUBJECT = os.environ.get('VAPID_SUBJECT', 'mailto:[email protected]')
SITE_URL = os.environ.get('SITE_URL', 'https://www.vsmcollection.com')
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', '')
PUSH_POLL_INTERVAL = float(os.environ.get('PUSH_POLL_INTERVAL', '2'))
PUSH_WORKER_ENABLED = os.environ.get('PUSH_WORKER_ENABLED', 'false').lower() in ('1', 'true', 'yes')

app = FastAPI(title="VSM Ambassador API")
api_router = APIRouter(prefix="/api")

logger = logging.getLogger("vsm-amb")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# ---------- Models ----------
class ApplyRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=4, max_length=40)
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    username: Optional[str] = ""
    main_platform: Optional[str] = "Instagram"
    profile_url: Optional[str] = ""
    motivation: str = Field(min_length=10, max_length=5000)


class ApplyResponse(BaseModel):
    ok: bool
    user_id: str
    application_id: int
    already_existed: bool = False


class MeResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    profile: Optional[dict] = None
    application: Optional[dict] = None
    promo_codes: list = []
    tracking_link: Optional[dict] = None


class ResolveIdentifierRequest(BaseModel):
    identifier: str = Field(min_length=2, max_length=200)


class ResolveIdentifierResponse(BaseModel):
    email: str


class PushSubscribeRequest(BaseModel):
    subscription: dict


class PushTestRequest(BaseModel):
    title: Optional[str] = "VSM Ambassador"
    body: Optional[str] = "Test notification"
    url: Optional[str] = "/dashboard"


# ---------- Helpers ----------
SVC_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


def normalize_phone(s: str) -> str:
    return ''.join(ch for ch in (s or '') if ch.isdigit() or ch == '+')


async def supabase_signup(client: httpx.AsyncClient, email: str, password: str, metadata: dict) -> Optional[dict]:
    r = await client.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=SVC_HEADERS,
        json={"email": email, "password": password, "email_confirm": True, "user_metadata": metadata},
        timeout=20,
    )
    if r.status_code in (200, 201):
        return r.json()
    if r.status_code in (422, 400) and "already" in r.text.lower():
        return None
    raise HTTPException(status_code=502, detail=f"Supabase signup error: {r.text}")


async def supabase_get_user_by_email(client: httpx.AsyncClient, email: str) -> Optional[str]:
    r = await client.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=SVC_HEADERS, params={"email": email}, timeout=20,
    )
    if r.status_code != 200:
        return None
    data = r.json()
    users = data.get("users") if isinstance(data, dict) else data
    if not users:
        return None
    for u in users:
        if (u.get("email") or "").lower() == email.lower():
            return u.get("id")
    return None


async def supabase_upsert_profile(client: httpx.AsyncClient, user_id: str, payload: dict) -> None:
    r = await client.post(
        f"{SUPABASE_URL}/rest/v1/profiles",
        headers={**SVC_HEADERS, "Prefer": "resolution=merge-duplicates"},
        json={"id": user_id, **payload}, timeout=20,
    )
    if r.status_code not in (200, 201, 204):
        logger.warning("profile upsert failed: %s %s", r.status_code, r.text)


async def supabase_find_application(client: httpx.AsyncClient, user_id: str) -> Optional[dict]:
    r = await client.get(
        f"{SUPABASE_URL}/rest/v1/ambassador_applications",
        headers=SVC_HEADERS,
        params={"user_id": f"eq.{user_id}", "select": "*", "order": "created_at.desc"},
        timeout=15,
    )
    if r.status_code != 200:
        return None
    rows = r.json() or []
    if not rows:
        return None
    approved = next((x for x in rows if (x.get("status") or "").lower() == "approved"), None)
    return approved or rows[0]


async def supabase_insert_application(client: httpx.AsyncClient, app_payload: dict) -> int:
    r = await client.post(
        f"{SUPABASE_URL}/rest/v1/ambassador_applications",
        headers={**SVC_HEADERS, "Prefer": "return=representation"},
        json=app_payload, timeout=20,
    )
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Insert application failed: {r.text}")
    rows = r.json()
    if not rows:
        raise HTTPException(status_code=502, detail="Insert returned empty result")
    return rows[0]["id"]


async def supabase_get_promo_codes(client: httpx.AsyncClient, user_id: str) -> list:
    r = await client.get(
        f"{SUPABASE_URL}/rest/v1/promo_codes",
        headers=SVC_HEADERS,
        params={"ambassador_id": f"eq.{user_id}", "select": "*", "order": "created_at.desc"},
        timeout=15,
    )
    if r.status_code != 200:
        return []
    return r.json() or []


def _badge_slug(user_id: str) -> str:
    return f"VSM-{(user_id or '').replace('-', '')[-4:].upper()}"


async def ensure_ambassador_link(client: httpx.AsyncClient, user_id: str) -> Optional[dict]:
    """Ensure the ambassador has at least one active tracking link.
    Returns the link record."""
    r = await client.get(
        f"{SUPABASE_URL}/rest/v1/ambassador_links",
        headers=SVC_HEADERS,
        params={"ambassador_id": f"eq.{user_id}", "select": "*", "order": "created_at.desc"},
        timeout=15,
    )
    rows = r.json() if r.status_code == 200 else []
    if rows:
        return rows[0]
    # Create a default tracking link using the badge code as the slug.
    slug = _badge_slug(user_id)
    r2 = await client.post(
        f"{SUPABASE_URL}/rest/v1/ambassador_links",
        headers={**SVC_HEADERS, "Prefer": "return=representation"},
        json={"ambassador_id": user_id, "slug": slug, "target_type": "product", "active": True},
        timeout=15,
    )
    if r2.status_code in (200, 201):
        rows2 = r2.json()
        if rows2:
            return rows2[0]
    return None


async def verify_user_token(authorization: str = Header(default="")) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            timeout=15,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return r.json()


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "vsm-ambassador-api", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"ok": True}


@api_router.post("/ambassador/apply", response_model=ApplyResponse)
async def submit_application(payload: ApplyRequest):
    async with httpx.AsyncClient() as client:
        user = await supabase_signup(
            client, payload.email, payload.password,
            {"full_name": payload.full_name, "phone": payload.phone},
        )
        already_existed = False
        if user is None:
            user_id = await supabase_get_user_by_email(client, payload.email)
            already_existed = True
            if not user_id:
                raise HTTPException(status_code=409, detail="Email déjà utilisé.")
        else:
            user_id = user["id"]

        await supabase_upsert_profile(client, user_id, {
            "full_name": payload.full_name,
            "email": payload.email,
            "phone": payload.phone,
            "name": payload.full_name,
        })

        existing = await supabase_find_application(client, user_id)
        if existing:
            return ApplyResponse(ok=True, user_id=user_id, application_id=int(existing["id"]), already_existed=True)

        application_id = await supabase_insert_application(client, {
            "full_name": payload.full_name,
            "phone": payload.phone,
            "email": payload.email,
            "username": (payload.username or payload.full_name).strip()[:120] or payload.full_name,
            "main_platform": payload.main_platform or "Instagram",
            "profile_url": payload.profile_url or "",
            "motivation": payload.motivation,
            "status": "pending",
            "user_id": user_id,
        })

    return ApplyResponse(ok=True, user_id=user_id, application_id=application_id, already_existed=already_existed)


@api_router.get("/ambassador/me", response_model=MeResponse)
async def get_me(user=Depends(verify_user_token)):
    user_id = user["id"]
    async with httpx.AsyncClient() as client:
        r1 = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=SVC_HEADERS, params={"id": f"eq.{user_id}", "select": "*"}, timeout=15,
        )
        r2 = await client.get(
            f"{SUPABASE_URL}/rest/v1/ambassador_applications",
            headers=SVC_HEADERS,
            params={"user_id": f"eq.{user_id}", "select": "*", "order": "created_at.desc", "limit": 1},
            timeout=15,
        )
        promos = await supabase_get_promo_codes(client, user_id)

    profile = (r1.json() or [None])[0] if r1.status_code == 200 else None
    rows = r2.json() if r2.status_code == 200 else []
    if not isinstance(rows, list):
        rows = []
    approved = next((x for x in rows if (x.get("status") or "").lower() == "approved"), None)
    application = approved or (rows[0] if rows else None)

    # Auto-provision a tracking link for approved ambassadors
    tracking_link = None
    if application and (application.get('status') or '').lower() == 'approved':
        async with httpx.AsyncClient() as client2:
            tracking_link = await ensure_ambassador_link(client2, user_id)

    return MeResponse(user_id=user_id, email=user.get("email"), profile=profile,
                      application=application, promo_codes=promos, tracking_link=tracking_link)


@api_router.post("/auth/resolve-identifier", response_model=ResolveIdentifierResponse)
async def resolve_identifier(payload: ResolveIdentifierRequest):
    """Accept email | phone | badge code → return the user's email so the
    frontend can call supabase.auth.signInWithPassword(email, password)."""
    raw = (payload.identifier or '').strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Identifiant requis")

    # email shortcut
    if '@' in raw:
        return ResolveIdentifierResponse(email=raw.lower())

    async with httpx.AsyncClient() as client:
        # Badge VSM-XXXX → search profiles whose id ends with that hex
        if raw.upper().startswith('VSM-') and len(raw) >= 5:
            tail = raw.split('-', 1)[1].lower()
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=SVC_HEADERS,
                params={"select": "id,email", "id": f"like.*{tail}", "limit": 5},
                timeout=15,
            )
            # PostgREST 'like' with hex on uuid usually fails — fall back to scanning recent profiles
            candidates = r.json() if r.status_code == 200 else []
            if not candidates:
                # Fallback: pull active ambassadors with approved application and match by hash
                r2 = await client.get(
                    f"{SUPABASE_URL}/rest/v1/ambassador_applications",
                    headers=SVC_HEADERS,
                    params={"status": "eq.approved", "select": "user_id,email", "limit": 1000},
                    timeout=20,
                )
                apps = r2.json() if r2.status_code == 200 else []
                tail_up = raw.split('-', 1)[1].upper()
                for a in apps:
                    uid = (a.get('user_id') or '').replace('-', '').upper()
                    if uid.endswith(tail_up):
                        if a.get('email'):
                            return ResolveIdentifierResponse(email=a['email'])
            for p in candidates:
                if p.get('email'):
                    return ResolveIdentifierResponse(email=p['email'])
            raise HTTPException(status_code=404, detail="Badge ambassadeur introuvable")

        # Phone — normalize and match against profiles.phone OR ambassador_applications.phone
        norm = normalize_phone(raw)
        # try profiles.phone variants
        for value in {raw, norm, '+' + norm.lstrip('+')}:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=SVC_HEADERS, params={"phone": f"eq.{value}", "select": "email", "limit": 1}, timeout=15,
            )
            data = r.json() if r.status_code == 200 else []
            if data and data[0].get('email'):
                return ResolveIdentifierResponse(email=data[0]['email'])
        # try ambassador_applications.phone (and fallback by tail)
        for value in {raw, norm}:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/ambassador_applications",
                headers=SVC_HEADERS,
                params={"phone": f"eq.{value}", "select": "email", "limit": 1, "order": "created_at.desc"},
                timeout=15,
            )
            data = r.json() if r.status_code == 200 else []
            if data and data[0].get('email'):
                return ResolveIdentifierResponse(email=data[0]['email'])
        # Last resort: look up by last-9-digit suffix
        suffix = norm[-9:] if len(norm) >= 9 else norm
        if suffix:
            r = await client.get(
                f"{SUPABASE_URL}/rest/v1/ambassador_applications",
                headers=SVC_HEADERS,
                params={"phone": f"like.*{suffix}", "select": "email,phone", "limit": 5, "order": "created_at.desc"},
                timeout=15,
            )
            data = r.json() if r.status_code == 200 else []
            for d in data:
                if d.get('email'):
                    return ResolveIdentifierResponse(email=d['email'])
    raise HTTPException(status_code=404, detail="Identifiant introuvable")


# ----- Push subscriptions stored in `settings` table -----
def _push_key(user_id: str, endpoint: str) -> str:
    h = hashlib.sha256(endpoint.encode()).hexdigest()[:16]
    return f"push_sub_{user_id}_{h}"


async def push_save(client: httpx.AsyncClient, user_id: str, subscription: dict) -> None:
    endpoint = subscription.get('endpoint') or ''
    if not endpoint:
        raise HTTPException(status_code=400, detail="Subscription endpoint missing")
    key = _push_key(user_id, endpoint)
    value = json.dumps({"user_id": user_id, "subscription": subscription})
    r = await client.post(
        f"{SUPABASE_URL}/rest/v1/settings",
        headers={**SVC_HEADERS, "Prefer": "resolution=merge-duplicates"},
        json={"key": key, "value": value, "description": "push_subscription"},
        timeout=15,
    )
    if r.status_code not in (200, 201, 204):
        logger.warning("push subscription save failed: %s %s", r.status_code, r.text)


async def push_list(client: httpx.AsyncClient, user_id: str) -> list:
    r = await client.get(
        f"{SUPABASE_URL}/rest/v1/settings",
        headers=SVC_HEADERS,
        params={"key": f"like.push_sub_{user_id}_*", "select": "key,value"},
        timeout=15,
    )
    if r.status_code != 200:
        return []
    out = []
    for row in r.json() or []:
        try:
            data = json.loads(row.get('value') or '{}')
            sub = data.get('subscription')
            if sub:
                out.append({"key": row['key'], "subscription": sub})
        except Exception:
            continue
    return out


async def push_delete(client: httpx.AsyncClient, key: str) -> None:
    await client.delete(
        f"{SUPABASE_URL}/rest/v1/settings",
        headers=SVC_HEADERS, params={"key": f"eq.{key}"}, timeout=10,
    )


async def send_push(user_id: str, title: str, body: str, url: str = "/dashboard") -> int:
    if not VAPID_PRIVATE_KEY:
        logger.warning("VAPID private key missing, skip push")
        return 0
    payload = json.dumps({"title": title, "body": body, "url": url, "icon": "/icons/image_1782342973184.jpeg"})
    sent = 0
    async with httpx.AsyncClient() as client:
        subs = await push_list(client, user_id)
        for s in subs:
            try:
                webpush(
                    subscription_info=s['subscription'],
                    data=payload,
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": VAPID_SUBJECT},
                )
                sent += 1
            except WebPushException as exc:
                status_code = getattr(exc.response, 'status_code', None) if getattr(exc, 'response', None) else None
                if status_code in (404, 410):
                    await push_delete(client, s['key'])
                logger.warning("webpush failed: %s", exc)
    return sent


@api_router.get("/push/public-key")
async def push_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


@api_router.post("/push/subscribe")
async def push_subscribe(payload: PushSubscribeRequest, user=Depends(verify_user_token)):
    async with httpx.AsyncClient() as client:
        await push_save(client, user["id"], payload.subscription)
    return {"ok": True}


@api_router.post("/push/test")
async def push_test(payload: PushTestRequest, user=Depends(verify_user_token)):
    sent = await send_push(user["id"], payload.title, payload.body, payload.url)
    return {"ok": True, "sent": sent}


# ----- Admin/internal helper: when an application is approved, send push -----
# Called by frontend after detecting status change (polling), or could be called from a Supabase webhook later.
@api_router.post("/ambassador/notify-approval")
async def notify_approval(background: BackgroundTasks, user=Depends(verify_user_token)):
    """Send approval push for the calling user (idempotent — they can call once per app session)."""
    # verify status is approved
    async with httpx.AsyncClient() as client:
        app = await supabase_find_application(client, user["id"])
    if not app or (app.get('status') or '').lower() != 'approved':
        raise HTTPException(status_code=409, detail="Application is not approved")
    background.add_task(
        send_push, user["id"],
        "Candidature approuvée ✓",
        "Bienvenue dans le Programme Ambassadeur VSM ! Accédez à votre dashboard.",
        "/dashboard",
    )
    return {"ok": True}


# ---------- Push outbox (Supabase DB triggers → VAPID) ----------
class PushWebhookPayload(BaseModel):
    outbox_id: Optional[int] = None
    user_id: str
    title: str
    body: str
    url: str = "/dashboard"
    event_type: str = "generic"
    payload: Optional[dict] = None


async def _mark_outbox(client: httpx.AsyncClient, outbox_id: int, error: Optional[str] = None) -> None:
    await client.patch(
        f"{SUPABASE_URL}/rest/v1/push_outbox",
        headers=SVC_HEADERS,
        params={"id": f"eq.{outbox_id}"},
        json={
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "error": error,
        },
        timeout=10,
    )


async def _process_push_row(row: dict) -> None:
    user_id = row.get("user_id")
    if not user_id:
        return
    sent = await send_push(
        user_id,
        row.get("title") or "VSM Ambassador",
        row.get("body") or "",
        row.get("url") or "/dashboard",
    )
    outbox_id = row.get("id") or row.get("outbox_id")
    if outbox_id:
        async with httpx.AsyncClient() as client:
            await _mark_outbox(client, int(outbox_id), None if sent else "no_active_subscription")


async def _fetch_pending_outbox(client: httpx.AsyncClient, limit: int = 25) -> list:
    r = await client.get(
        f"{SUPABASE_URL}/rest/v1/push_outbox",
        headers=SVC_HEADERS,
        params={
            "processed_at": "is.null",
            "order": "created_at.asc",
            "limit": str(limit),
            "select": "id,user_id,title,body,url,event_type",
        },
        timeout=15,
    )
    if r.status_code != 200:
        logger.warning("push_outbox fetch failed: %s %s", r.status_code, r.text)
        return []
    return r.json() or []


async def push_outbox_worker() -> None:
    await asyncio.sleep(2)
    while True:
        try:
            async with httpx.AsyncClient() as client:
                rows = await _fetch_pending_outbox(client)
                for row in rows:
                    await _process_push_row(row)
        except Exception as exc:
            logger.warning("push outbox worker error: %s", exc)
        await asyncio.sleep(PUSH_POLL_INTERVAL)


@api_router.post("/webhooks/push-event")
async def push_webhook(
    payload: PushWebhookPayload,
    x_webhook_secret: str = Header(default="", alias="X-Webhook-Secret"),
):
    if not WEBHOOK_SECRET or x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    asyncio.create_task(_process_push_row(payload.model_dump()))
    return {"ok": True}


# ---------- Tracking (frontend hits this then redirects) ----------
@api_router.get("/track/{slug}")
async def tracking_record(slug: str, request_referer: Optional[str] = Header(default=None, alias="Referer"), user_agent: Optional[str] = Header(default="", alias="User-Agent")):
    """Record click then return the destination URL the frontend should redirect to."""
    target = f"{SITE_URL}/?ref={slug}"
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/ambassador_links",
            headers=SVC_HEADERS,
            params={"slug": f"eq.{slug}", "select": "id,ambassador_id,target_type,target_product_id,active", "limit": 1},
            timeout=10,
        )
        link = (r.json() or [None])[0] if r.status_code == 200 else None
        if link and link.get('active', True):
            try:
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/ambassador_clicks",
                    headers=SVC_HEADERS,
                    json={
                        "link_id": link["id"],
                        "referrer": (request_referer or '')[:512],
                        "user_agent": (user_agent or '')[:512],
                    },
                    timeout=10,
                )
            except Exception as e:
                logger.warning("click insert failed: %s", e)
            # Optionally append product to URL
            if link.get('target_type') == 'product' and link.get('target_product_id'):
                target = f"{SITE_URL}/produit/{link['target_product_id']}?ref={slug}"
    return {"target": target}


app.include_router(api_router)


@app.on_event("startup")
async def _start_push_outbox_worker() -> None:
    if PUSH_WORKER_ENABLED:
        asyncio.create_task(push_outbox_worker())
        logger.info("Push outbox worker enabled (legacy mode)")
    else:
        logger.info("Push outbox worker disabled — using Supabase Edge Function send-push")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
