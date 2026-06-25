#!/usr/bin/env python3
"""Deploy send-push Edge Function and wire DB webhook URL."""
from __future__ import annotations

import os
import secrets
import subprocess
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
load_dotenv(ROOT / ".env")

MIGRATION = Path(__file__).resolve().parent / "migrations" / "002_edge_function_webhook.sql"
MIGRATION_PROMO = Path(__file__).resolve().parent / "migrations" / "003_promo_notify.sql"
MIGRATION_RLS = Path(__file__).resolve().parent / "migrations" / "004_ambassador_rls.sql"
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "ehmgjgrekjoaohnnlfmw")


def main() -> None:
    url = os.environ.get("DATABASE_URL")
    supabase_url = os.environ.get("SUPABASE_URL", f"https://{PROJECT_REF}.supabase.co")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")
    webhook_secret = os.environ.get("WEBHOOK_SECRET") or secrets.token_urlsafe(32)
    edge_url = f"{supabase_url.rstrip('/')}/functions/v1/send-push"

    if not service_key:
        print("SUPABASE_SERVICE_KEY required in backend/.env", file=sys.stderr)
        sys.exit(1)

    # Deploy edge function via Supabase CLI if available
    deploy_cmd = [
        "npx", "supabase", "functions", "deploy", "send-push",
        "--project-ref", PROJECT_REF,
        "--no-verify-jwt",
    ]
    env = {
        **os.environ,
        "SUPABASE_ACCESS_TOKEN": os.environ.get("SUPABASE_ACCESS_TOKEN", ""),
    }
    try:
        subprocess.run(deploy_cmd, cwd=REPO, check=False, env=env)
        print("Edge function deploy attempted (requires supabase login / SUPABASE_ACCESS_TOKEN)")
    except FileNotFoundError:
        print("Supabase CLI not found — deploy manually: npx supabase functions deploy send-push")

    # Set edge function secrets
    secrets_cmd = [
        "npx", "supabase", "secrets", "set",
        f"VAPID_PUBLIC_KEY={os.environ.get('VAPID_PUBLIC_KEY', '')}",
        f"VAPID_PRIVATE_KEY={os.environ.get('VAPID_PRIVATE_KEY', '')}",
        f"VAPID_SUBJECT={os.environ.get('VAPID_SUBJECT', 'mailto:contact@vsmcollection.com')}",
        f"WEBHOOK_SECRET={webhook_secret}",
        f"SUPABASE_URL={supabase_url}",
        f"SUPABASE_SERVICE_ROLE_KEY={service_key}",
        "--project-ref", PROJECT_REF,
    ]
    try:
        subprocess.run(secrets_cmd, cwd=REPO, check=False, env=env)
    except FileNotFoundError:
        pass

    if not url:
        print("DATABASE_URL missing — skip SQL migration")
        print(f"EDGE_FUNCTION_URL={edge_url}")
        print(f"WEBHOOK_SECRET={webhook_secret}")
        return

    sql = MIGRATION.read_text(encoding="utf-8")
    sql = sql.replace("{{EDGE_FUNCTION_URL}}", edge_url)
    sql = sql.replace("{{WEBHOOK_SECRET}}", webhook_secret)

    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql)
    if MIGRATION_PROMO.exists():
        cur.execute(MIGRATION_PROMO.read_text(encoding="utf-8"))
    if MIGRATION_RLS.exists():
        cur.execute(MIGRATION_RLS.read_text(encoding="utf-8"))
    conn.close()

    env_path = ROOT / ".env"
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    updates = {
        "WEBHOOK_SECRET": webhook_secret,
        "EDGE_FUNCTION_URL": edge_url,
        "PUSH_WORKER_ENABLED": "false",
    }
    out, seen = [], set()
    for line in lines:
        key = line.split("=", 1)[0] if "=" in line else ""
        if key in updates:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            out.append(line)
    for key, val in updates.items():
        if key not in seen:
            out.append(f"{key}={val}")
    env_path.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")

    print(f"DB webhook -> {edge_url}")
    print(f"WEBHOOK_SECRET saved to backend/.env")
    print("Set the same secrets on Supabase: Dashboard -> Edge Functions -> send-push -> Secrets")


if __name__ == "__main__":
    main()
