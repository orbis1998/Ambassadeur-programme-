"""VSM Ambassador PWA backend.

Acts as a thin secure proxy for operations that require the Supabase service
role (currently: creating Auth account + inserting ambassador_applications
which is RLS-protected). Everything else (dashboard reads, withdrawal RPC,
etc.) is performed directly from the React client using the user's JWT.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import os
import logging
from pathlib import Path
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_ANON_KEY = os.environ['SUPABASE_ANON_KEY']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']

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


# ---------- Helpers ----------
SVC_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


async def supabase_signup(client: httpx.AsyncClient, email: str, password: str, metadata: dict) -> Optional[dict]:
    """Create an Auth user via the admin API (auto-confirm). Returns user dict or None."""
    r = await client.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=SVC_HEADERS,
        json={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": metadata,
        },
        timeout=20,
    )
    if r.status_code in (200, 201):
        return r.json()
    if r.status_code in (422, 400) and "already" in r.text.lower():
        return None  # already exists
    raise HTTPException(status_code=502, detail=f"Supabase signup error: {r.text}")


async def supabase_get_user_by_email(client: httpx.AsyncClient, email: str) -> Optional[str]:
    r = await client.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=SVC_HEADERS,
        params={"email": email},
        timeout=20,
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
        json={"id": user_id, **payload},
        timeout=20,
    )
    if r.status_code not in (200, 201, 204):
        logger.warning("profile upsert failed: %s %s", r.status_code, r.text)


async def supabase_insert_application(client: httpx.AsyncClient, app_payload: dict) -> int:
    r = await client.post(
        f"{SUPABASE_URL}/rest/v1/ambassador_applications",
        headers={**SVC_HEADERS, "Prefer": "return=representation"},
        json=app_payload,
        timeout=20,
    )
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Insert application failed: {r.text}")
    rows = r.json()
    if not rows:
        raise HTTPException(status_code=502, detail="Insert returned empty result")
    return rows[0]["id"]


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "vsm-ambassador-api", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"ok": True}


@api_router.post("/ambassador/apply", response_model=ApplyResponse)
async def submit_application(payload: ApplyRequest):
    """Atomic signup + application insertion.

    Idempotent for the email side (re-use existing Auth user if needed).
    """
    async with httpx.AsyncClient() as client:
        # 1) create or find user
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

        # 2) upsert profile (additive)
        await supabase_upsert_profile(client, user_id, {
            "full_name": payload.full_name,
            "email": payload.email,
            "phone": payload.phone,
            "name": payload.full_name,
        })

        # 3) insert ambassador_applications
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


async def verify_user_token(authorization: str = Header(default="")) -> dict:
    """Verify a Supabase JWT by calling Supabase auth/v1/user with the token."""
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


@api_router.get("/ambassador/me", response_model=MeResponse)
async def get_me(user=Depends(verify_user_token)):
    """Return current user's profile + latest application using service role
    (bypasses RLS that hides applications from regular authenticated users)."""
    user_id = user["id"]
    async with httpx.AsyncClient() as client:
        r1 = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=SVC_HEADERS, params={"id": f"eq.{user_id}", "select": "*"}, timeout=15,
        )
        r2 = await client.get(
            f"{SUPABASE_URL}/rest/v1/ambassador_applications",
            headers=SVC_HEADERS,
            params={
                "user_id": f"eq.{user_id}",
                "select": "*",
                "order": "created_at.desc",
                "limit": 1,
            },
            timeout=15,
        )
    profile = (r1.json() or [None])[0] if r1.status_code == 200 else None
    application = (r2.json() or [None])[0] if r2.status_code == 200 else None
    return MeResponse(user_id=user_id, email=user.get("email"), profile=profile, application=application)


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
