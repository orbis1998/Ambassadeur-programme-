"""Apply push notification triggers on Supabase Postgres."""
import os
import secrets
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

MIGRATION = Path(__file__).resolve().parent / "migrations" / "001_push_webhooks.sql"


def upsert_env(path: Path, key: str, value: str) -> None:
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    out, seen = [], False
    for line in lines:
        if line.startswith(f"{key}="):
            out.append(f"{key}={value}")
            seen = True
        else:
            out.append(line)
    if not seen:
        out.append(f"{key}={value}")
    path.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")


def main() -> None:
    url = os.environ.get("DATABASE_URL")
    webhook_base = os.environ.get("WEBHOOK_BASE_URL", "").rstrip("/")
    webhook_secret = os.environ.get("WEBHOOK_SECRET") or secrets.token_urlsafe(32)

    if not url:
        print("Set DATABASE_URL in backend/.env", file=sys.stderr)
        sys.exit(1)

    sql = MIGRATION.read_text(encoding="utf-8")
    sql = sql.replace("{{WEBHOOK_BASE_URL}}", webhook_base or "")
    sql = sql.replace("{{WEBHOOK_SECRET}}", webhook_secret)

    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions")
        print("pg_net extension ready")
    except Exception as exc:
        print(f"pg_net note: {exc}")

    cur.execute(sql)
    print("Migration 001_push_webhooks applied")

    env_path = ROOT / ".env"
    upsert_env(env_path, "WEBHOOK_SECRET", webhook_secret)
    if webhook_base:
        upsert_env(env_path, "WEBHOOK_BASE_URL", webhook_base)
    print(f"WEBHOOK_SECRET saved to {env_path}")
    conn.close()


if __name__ == "__main__":
    main()
