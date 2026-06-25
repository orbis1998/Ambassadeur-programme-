#!/usr/bin/env python3
"""Test orders visibility under RLS as a specific ambassador."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

UID = "0835bd35-a4e6-4dd1-a5df-19fb59d63219"
URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.ehmgjgrekjoaohnnlfmw:Lalune002___@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
)


def main() -> None:
    conn = psycopg2.connect(URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("BEGIN")
    claims = f'{{"sub": "{UID}", "role": "authenticated", "aal": "aal1"}}'
    cur.execute("SET LOCAL role authenticated")
    cur.execute("SELECT set_config('request.jwt.claims', %s, true)", (claims,))

    cur.execute("SELECT auth.uid() AS uid")
    print("auth.uid():", cur.fetchone())

    cur.execute(
        "SELECT id, status, total_amount FROM orders WHERE ambassador_id = %s",
        (UID,),
    )
    print("orders via RLS:", [dict(r) for r in cur.fetchall()])

    cur.execute(
        "SELECT id, code, active FROM promo_codes WHERE ambassador_id = %s",
        (UID,),
    )
    print("promos via RLS:", [dict(r) for r in cur.fetchall()])

    cur.execute(
        "SELECT id, slug, active FROM ambassador_links WHERE ambassador_id = %s",
        (UID,),
    )
    print("links via RLS:", [dict(r) for r in cur.fetchall()])

    cur.execute("ROLLBACK")
    conn.close()


if __name__ == "__main__":
    main()
