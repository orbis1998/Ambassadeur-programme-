import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://www.vsmcollection.com").replace(/\/$/, "");

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

  const url = new URL(req.url);
  let slug = (url.searchParams.get("slug") || "").trim();
  if (!slug) {
    const parts = url.pathname.split("/").filter(Boolean);
    slug = decodeURIComponent(parts[parts.length - 1] || "").trim();
  }
  if (!slug) {
    return json({ detail: "slug_required" }, 400);
  }

  let target = `${SITE_URL}/?ref=${encodeURIComponent(slug)}`;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: links } = await admin
    .from("ambassador_links")
    .select("id,target_type,target_product_id,active")
    .eq("slug", slug)
    .limit(1);

  const link = links?.[0];
  if (link && link.active !== false) {
    const referrer = (req.headers.get("referer") || req.headers.get("referrer") || "").slice(0, 512);
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 512);

    await admin.from("ambassador_clicks").insert({
      link_id: link.id,
      referrer,
      user_agent: userAgent,
    });

    if (link.target_type === "product" && link.target_product_id) {
      target = `${SITE_URL}/produit/${link.target_product_id}?ref=${encodeURIComponent(slug)}`;
    }
  }

  return json({ target });
});
