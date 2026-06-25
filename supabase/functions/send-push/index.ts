import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@vsmcollection.com";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const svcHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

async function listPushSubscriptions(userId: string) {
  const prefix = `push_sub_${userId}_`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/settings?select=key,value&key=like.${encodeURIComponent(`${prefix}*`)}`,
    { headers: svcHeaders },
  );
  if (!res.ok) return [];
  const rows = await res.json();
  const out: { key: string; subscription: Record<string, unknown> }[] = [];
  for (const row of rows ?? []) {
    try {
      const parsed = JSON.parse(row.value ?? "{}");
      if (parsed.subscription) out.push({ key: row.key, subscription: parsed.subscription });
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
  if (!VAPID_PRIVATE_KEY) {
    if (outboxId) await markOutbox(outboxId, "vapid_not_configured", 0);
    return { ok: false, error: "vapid_not_configured", sent: 0 };
  }

  const subs = await listPushSubscriptions(userId);
  const payload = JSON.stringify({ title, body, url, icon: "/icons/image_1782342973184.jpeg" });
  let sent = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription as Record<string, unknown>, payload);
      sent += 1;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await deleteSubscription(s.key);
      }
      console.warn("webpush failed", err);
    }
  }

  if (outboxId) await markOutbox(outboxId, null, sent);
  return { ok: true, sent };
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
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
  }
});
