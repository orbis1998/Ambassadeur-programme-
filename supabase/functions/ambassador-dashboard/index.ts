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

  const [{ data: orders }, { data: links }, { data: withdrawals }, { data: rateRow }] = await Promise.all([
    admin
      .from("orders")
      .select("id, total_amount, status, created_at, customer_name")
      .eq("ambassador_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("ambassador_links")
      .select("id, slug, created_at, active")
      .eq("ambassador_id", userId),
    admin
      .from("ambassador_withdrawal_requests")
      .select("*")
      .eq("ambassador_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("settings")
      .select("value")
      .eq("key", "ambassador_commission_rate")
      .maybeSingle(),
  ]);

  const linkIds = (links || []).map((l) => l.id);
  let clicks: Record<string, unknown>[] = [];
  if (linkIds.length) {
    const { data: clickRows } = await admin
      .from("ambassador_clicks")
      .select("id, link_id, clicked_at, referrer, user_agent")
      .in("link_id", linkIds)
      .order("clicked_at", { ascending: false })
      .limit(500);
    clicks = clickRows || [];
  }

  let commissionRate = 10;
  if (rateRow?.value) {
    const v = parseFloat(String(rateRow.value));
    if (!Number.isNaN(v)) commissionRate = v;
  }

  return json({
    orders: orders || [],
    links: links || [],
    clicks,
    withdrawals: withdrawals || [],
    commission_rate: commissionRate,
  });
});
