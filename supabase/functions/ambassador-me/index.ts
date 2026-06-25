import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function badgeSlug(userId: string): string {
  const tail = userId.replace(/-/g, "").slice(-4).toUpperCase();
  return `VSM-${tail}`;
}

async function ensureAmbassadorLink(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const { data: rows } = await admin
    .from("ambassador_links")
    .select("*")
    .eq("ambassador_id", userId)
    .order("created_at", { ascending: false });

  const existing = (rows || []).find((l) => l.active !== false) || rows?.[0];
  if (existing) return existing;

  const slug = badgeSlug(userId);
  const { data: created } = await admin
    .from("ambassador_links")
    .insert({
      ambassador_id: userId,
      slug,
      target_type: "product",
      active: true,
    })
    .select("*")
    .maybeSingle();

  return created || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "GET") {
    return json({ detail: "method_not_allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ detail: "unauthorized" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ detail: "unauthorized" }, 401);
  }

  const userId = userData.user.id;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const [{ data: profile }, { data: apps }, { data: promos }, { data: links }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("ambassador_applications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("promo_codes").select("*").eq("ambassador_id", userId).order("created_at", { ascending: false }),
    admin.from("ambassador_links").select("*").eq("ambassador_id", userId).order("created_at", { ascending: false }),
  ]);

  const rows = apps || [];
  const approved = rows.find((x) => (x.status || "").toLowerCase() === "approved");
  const application = approved || rows[0] || null;
  const linkRows = links || [];
  let tracking_link = linkRows.find((l) => l.active !== false) || linkRows[0] || null;

  if (application && (application.status || "").toLowerCase() === "approved" && !tracking_link) {
    tracking_link = await ensureAmbassadorLink(admin, userId);
  }

  return json({
    user_id: userId,
    email: userData.user.email,
    profile: profile || null,
    application,
    promo_codes: promos || [],
    tracking_link,
  });
});
