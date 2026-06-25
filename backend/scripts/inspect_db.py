#!/usr/bin/env python3
"""Inspect Supabase schema, RLS, and ambassador data."""
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

URL = os.environ.get("DATABASE_URL") or (
    "postgresql://postgres.ehmgjgrekjoaohnnlfmw:Lalune002___"
    "@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
)

TABLES = [
    "orders",
    "ambassador_links",
    "ambassador_clicks",
    "promo_codes",
    "ambassador_applications",
    "profiles",
    "ambassador_withdrawal_requests",
    "settings",
    "push_outbox",
]


def main() -> None:
    conn = psycopg2.connect(URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    print("=== COLUMNS ===")
    for t in TABLES:
        cur.execute(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (t,),
        )
        cols = [f"{r['column_name']}({r['data_type']})" for r in cur.fetchall()]
        print(f"{t}: {', '.join(cols) if cols else 'MISSING'}")

    print("\n=== RLS ===")
    cur.execute(
        """
        SELECT c.relname, c.relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname = ANY(%s)
        ORDER BY c.relname
        """,
        (TABLES,),
    )
    for r in cur.fetchall():
        print(dict(r))

    print("\n=== ALL POLICIES (public) ===")
    cur.execute(
        """
        SELECT tablename, policyname, roles, cmd, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
        """
    )
    for r in cur.fetchall():
        print(f"[{r['tablename']}] {r['policyname']} ({r['cmd']}) roles={r['roles']}")
        print(f"  qual: {r['qual']}")

    print("\n=== Angelina / VSM-3219 ===")
    cur.execute(
        """
        SELECT id, full_name, email, phone, role
        FROM profiles
        WHERE full_name ILIKE '%angelina%' OR full_name ILIKE '%liyolo%'
        LIMIT 5
        """
    )
    profiles = cur.fetchall()
    for p in profiles:
        print("profile:", dict(p))

    cur.execute(
        """
        SELECT id, user_id, full_name, email, status, created_at
        FROM ambassador_applications
        WHERE full_name ILIKE '%angelina%' OR full_name ILIKE '%liyolo%'
        LIMIT 5
        """
    )
    for a in cur.fetchall():
        print("app:", dict(a))

    uid = profiles[0]["id"] if profiles else None
    if not uid:
        cur.execute(
            """
            SELECT user_id FROM ambassador_applications
            WHERE full_name ILIKE '%angelina%' AND user_id IS NOT NULL
            ORDER BY created_at DESC LIMIT 1
            """
        )
        row = cur.fetchone()
        uid = row["user_id"] if row else None
    if uid:
        tail = str(uid).replace("-", "")[-4:].upper()
        print(f"\nuser_id={uid}  expected_badge=VSM-{tail}")
        for q, label in [
            ("SELECT count(*) c FROM orders WHERE ambassador_id = %s", "orders"),
            ("SELECT count(*) c FROM ambassador_links WHERE ambassador_id = %s", "links"),
            ("SELECT count(*) c FROM promo_codes WHERE ambassador_id = %s", "promos"),
        ]:
            cur.execute(q, (uid,))
            print(f"  {label}: {cur.fetchone()['c']}")

        cur.execute(
            "SELECT id, status, total_amount FROM orders WHERE ambassador_id = %s",
            (uid,),
        )
        print("  order rows:", [dict(x) for x in cur.fetchall()])

        cur.execute("BEGIN")
        cur.execute("SET LOCAL role authenticated")
        cur.execute("SELECT set_config('request.jwt.claim.sub', %s, true)", (str(uid),))
        cur.execute("SELECT set_config('request.jwt.claim.role', 'authenticated', true)")
        cur.execute(
            "SELECT id, status, total_amount FROM orders WHERE ambassador_id = %s",
            (uid,),
        )
        print("  RLS orders:", [dict(x) for x in cur.fetchall()])
        cur.execute("ROLLBACK")

    print("\n=== orders column check (ambassador attribution) ===")
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='orders'
        AND column_name ILIKE ANY(ARRAY['%ambassador%','%ref%','%promo%','%source%'])
        """
    )
    print([r["column_name"] for r in cur.fetchall()])

    cur.execute(
        """
        SELECT ambassador_id, count(*) c
        FROM orders WHERE ambassador_id IS NOT NULL
        GROUP BY ambassador_id ORDER BY c DESC LIMIT 8
        """
    )
    print("top ambassadors by order count:", [dict(r) for r in cur.fetchall()])

    cur.execute("SELECT count(*) c FROM orders WHERE ambassador_id IS NULL")
    print("orders without ambassador_id:", cur.fetchone()["c"])

    cur.execute("SELECT id, status, total_amount, ambassador_id FROM orders ORDER BY created_at DESC LIMIT 5")
    print("latest orders:", [dict(r) for r in cur.fetchall()])

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
