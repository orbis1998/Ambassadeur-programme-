import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
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

function normalizePhone(s: string): string {
  return (s || "").split("").filter((ch) => /\d/.test(ch) || ch === "+").join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ detail: "method_not_allowed" }, 405);
  }

  let identifier = "";
  try {
    const body = await req.json();
    identifier = String(body?.identifier || "").trim();
  } catch {
    return json({ detail: "Identifiant requis" }, 400);
  }

  if (!identifier) {
    return json({ detail: "Identifiant requis" }, 400);
  }

  if (identifier.includes("@")) {
    return json({ email: identifier.toLowerCase() });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (identifier.toUpperCase().startsWith("VSM-") && identifier.length >= 5) {
    const tailUp = identifier.split("-", 2)[1]?.toUpperCase() ?? "";
    const { data: apps } = await admin
      .from("ambassador_applications")
      .select("user_id, email")
      .eq("status", "approved")
      .limit(1000);

    for (const app of apps || []) {
      const uid = (app.user_id || "").replace(/-/g, "").toUpperCase();
      if (uid.endsWith(tailUp) && app.email) {
        return json({ email: app.email });
      }
    }
    return json({ detail: "Badge ambassadeur introuvable" }, 404);
  }

  const norm = normalizePhone(identifier);
  const phoneVariants = [identifier, norm, `+${norm.replace(/^\+/, "")}`];

  for (const value of phoneVariants) {
    const { data: profiles } = await admin.from("profiles").select("email").eq("phone", value).limit(1);
    if (profiles?.[0]?.email) {
      return json({ email: profiles[0].email });
    }
  }

  for (const value of [identifier, norm]) {
    const { data: apps } = await admin
      .from("ambassador_applications")
      .select("email")
      .eq("phone", value)
      .order("created_at", { ascending: false })
      .limit(1);
    if (apps?.[0]?.email) {
      return json({ email: apps[0].email });
    }
  }

  const suffix = norm.length >= 9 ? norm.slice(-9) : norm;
  if (suffix) {
    const { data: apps } = await admin
      .from("ambassador_applications")
      .select("email, phone")
      .like("phone", `%${suffix}`)
      .order("created_at", { ascending: false })
      .limit(5);
    for (const row of apps || []) {
      if (row.email) {
        return json({ email: row.email });
      }
    }
  }

  return json({ detail: "Identifiant introuvable" }, 404);
});
