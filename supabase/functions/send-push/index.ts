import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@vsmcollection.com";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

async function getAppServer(): Promise<webpush.ApplicationServer | null> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  if (!appServerPromise) {
    appServerPromise = loadVapidKeyPair(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).then((vapidKeys) =>
      webpush.ApplicationServer.new({
        contactInformation: VAPID_SUBJECT,
        vapidKeys,
      })
    );
  }
  try {
    return await appServerPromise;
  } catch (err) {
    console.error("vapid_load_failed", err);
    appServerPromise = null;
    return null;
  }
}

type StoredSub = { key: string; subscription: Record<string, unknown> };

function normalizeSubscription(raw: Record<string, unknown>) {
  const keys = raw.keys as Record<string, string> | undefined;
  const endpoint = raw.endpoint;
  if (typeof endpoint !== "string" || !keys?.p256dh || !keys?.auth) return null;
  return {
    endpoint,
    expirationTime: (raw.expirationTime as number | null | undefined) ?? null,
    keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) },
  };
}

async function listPushSubscriptions(userId: string): Promise<{ subs: StoredSub[]; error?: string }> {
  const admin = adminClient();
  if (!admin) return { subs: [], error: "missing_supabase_service_role" };

  const { data, error } = await admin.rpc("list_user_push_subscriptions", { p_user_id: userId });
  if (error) {
    console.error("list_user_push_subscriptions", error);
    return { subs: [], error: error.message };
  }

  const rows = Array.isArray(data) ? data : [];
  const subs: StoredSub[] = [];
  for (const row of rows) {
    const key = String(row?.setting_key ?? row?.key ?? "");
    let subscription: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(String(row?.setting_value ?? row?.value ?? "{}"));
      subscription = (parsed?.subscription ?? parsed) as Record<string, unknown>;
    } catch {
      subscription = null;
    }
    if (key && subscription && normalizeSubscription(subscription)) {
      subs.push({ key, subscription });
    }
  }
  return { subs };
}

async function deleteSubscription(key: string) {
  const admin = adminClient();
  if (!admin) return;
  await admin.from("settings").delete().eq("key", key);
}

async function markOutbox(outboxId: number, error: string | null) {
  if (!outboxId) return;
  const admin = adminClient();
  if (!admin) return;
  await admin.from("push_outbox").update({
    processed_at: new Date().toISOString(),
    error,
  }).eq("id", outboxId);
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
    if (outboxId) await markOutbox(outboxId, "vapid_not_configured");
    return { ok: false, error: "vapid_not_configured", sent: 0 };
  }

  const { subs, error: listError } = await listPushSubscriptions(userId);
  if (!subs.length) {
    const err = listError ?? "no_active_subscription";
    if (outboxId) await markOutbox(outboxId, err);
    return { ok: true, sent: 0, subscriptions_found: 0, error: err };
  }

  const payload = JSON.stringify({ title, body, url, icon: "/icons/image_1782342973184.jpeg" });
  let sent = 0;
  const failures: string[] = [];

  for (const s of subs) {
    const normalized = normalizeSubscription(s.subscription);
    if (!normalized) {
      failures.push(`${s.key}:invalid_shape`);
      continue;
    }
    try {
      const sub = appServer.subscribe(normalized);
      await sub.pushTextMessage(payload, { urgency: webpush.Urgency.High });
      sent += 1;
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number }).status ??
        (err as { statusCode?: number }).statusCode;
      const msg = String((err as Error)?.message ?? err).slice(0, 120);
      failures.push(`${s.key}:${status ?? "err"}:${msg}`);
      if (status === 404 || status === 410) {
        await deleteSubscription(s.key);
      }
      console.warn("webpush failed", s.key, err);
    }
  }

  const outboxError = sent > 0 ? null : (failures[0] ?? "delivery_failed");
  if (outboxId) await markOutbox(outboxId, outboxError);

  return {
    ok: true,
    sent,
    subscriptions_found: subs.length,
    failures: failures.slice(0, 5),
    error: sent > 0 ? null : outboxError,
  };
}

async function healthPayload() {
  const admin = adminClient();
  let pushSubs = 0;
  let serviceRoleOk = false;
  let serviceRoleError: string | undefined;
  if (admin) {
    const { count, error } = await admin
      .from("settings")
      .select("*", { count: "exact", head: true })
      .like("key", "push_sub_%");
    serviceRoleOk = !error;
    serviceRoleError = error?.message;
    pushSubs = count ?? 0;
  }
  let vapidLoads = false;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    vapidLoads = (await getAppServer()) != null;
  }
  return {
    ok: true,
    vapid_configured: !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
    vapid_loads: vapidLoads,
    webhook_secret_configured: !!WEBHOOK_SECRET,
    service_role_configured: !!SUPABASE_SERVICE_ROLE_KEY,
    service_role_ok: serviceRoleOk,
    service_role_error: serviceRoleError,
    push_subscriptions_total: pushSubs,
  };
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
    return new Response(JSON.stringify(await healthPayload()), {
      headers: { "Content-Type": "application/json" },
    });
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
