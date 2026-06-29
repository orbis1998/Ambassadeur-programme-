import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@vsmcollection.com";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const svcHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

function base64UrlToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN[^-]+-----/g, "")
    .replace(/-----END[^-]+-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function loadVapidKeyPair(publicB64: string, privatePem: string): Promise<CryptoKeyPair> {
  const publicKey = await crypto.subtle.importKey(
    "raw",
    base64UrlToBytes(publicB64),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    [],
  );
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privatePem),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );
  return { publicKey, privateKey };
}

let appServerPromise: Promise<webpush.ApplicationServer> | null = null;

function getAppServer(): Promise<webpush.ApplicationServer> | null {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  if (!appServerPromise) {
    appServerPromise = loadVapidKeyPair(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).then((vapidKeys) =>
      webpush.ApplicationServer.new({
        contactInformation: VAPID_SUBJECT,
        vapidKeys,
      })
    );
  }
  return appServerPromise;
}

async function listPushSubscriptions(userId: string) {
  const prefix = `push_sub_${userId}_`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/settings?select=key,value&key=like.${encodeURIComponent(`${prefix}*`)}`,
    { headers: svcHeaders },
  );
  if (!res.ok) return [];
  const rows = await res.json();
  const out: { key: string; subscription: PushSubscription }[] = [];
  for (const row of rows ?? []) {
    try {
      const parsed = JSON.parse(row.value ?? "{}");
      if (parsed.subscription?.endpoint) {
        out.push({ key: row.key, subscription: parsed.subscription as PushSubscription });
      }
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

async function deleteSubscription(key: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: svcHeaders,
  });
}

async function markOutbox(outboxId: number, error: string | null, sent: number) {
  if (!outboxId) return;
  await fetch(`${SUPABASE_URL}/rest/v1/push_outbox?id=eq.${outboxId}`, {
    method: "PATCH",
    headers: svcHeaders,
    body: JSON.stringify({
      processed_at: new Date().toISOString(),
      error: error ?? (sent > 0 ? null : "no_active_subscription"),
    }),
  });
}

async function processOutboxRecord(record: Record<string, unknown>) {
  const outboxId = Number(record.id ?? record.outbox_id ?? 0);
  const userId = String(record.user_id ?? "");
  const title = String(record.title ?? "VSM Ambassador");
  const body = String(record.body ?? "");
  const url = String(record.url ?? "/dashboard");

  if (!userId) {
    return { ok: false, error: "invalid_record", sent: 0 };
  }

  const appServer = await getAppServer();
  if (!appServer) {
    if (outboxId) await markOutbox(outboxId, "vapid_not_configured", 0);
    return { ok: false, error: "vapid_not_configured", sent: 0 };
  }

  const subs = await listPushSubscriptions(userId);
  if (!subs.length) {
    if (outboxId) await markOutbox(outboxId, "no_active_subscription", 0);
    return { ok: true, sent: 0, error: "no_active_subscription" };
  }

  const payload = JSON.stringify({
    title,
    body,
    url,
    icon: "/icons/image_1782342973184.jpeg",
  });
  let sent = 0;

  for (const s of subs) {
    try {
      const sub = appServer.subscribe(s.subscription);
      await sub.pushMessage(payload, { urgency: webpush.Urgency.High });
      sent += 1;
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number }).status ??
        (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await deleteSubscription(s.key);
      }
      console.warn("webpush failed", err);
    }
  }

  if (outboxId) await markOutbox(outboxId, sent > 0 ? null : "delivery_failed", sent);
  return { ok: true, sent, subscriptions: subs.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-webhook-secret, content-type",
      },
    });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: true,
        vapid_configured: !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
        webhook_secret_configured: !!WEBHOOK_SECRET,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  const secret = req.headers.get("X-Webhook-Secret") ?? "";
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  try {
    const payload = await req.json();
    const record = payload.record ?? payload;
    const result = await processOutboxRecord(record);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err) }), {
      status: 500,
    });
  }
});
