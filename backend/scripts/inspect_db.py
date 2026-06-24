"""Inspect Supabase schema for push notification setup."""
import os
import sys

import psycopg2
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("DATABASE_URL")
if not url:
    print("DATABASE_URL missing", file=sys.stderr)
    sys.exit(1)

conn = psycopg2.connect(url)
cur = conn.cursor()

for table in ("settings", "orders", "ambassador_applications", "ambassador_withdrawal_requests"):
    cur.execute(
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,),
    )
    print(f"\n{table}:", cur.fetchall())

cur.execute("SELECT extname FROM pg_extension WHERE extname IN ('pg_net', 'http', 'supabase_vault')")
print("\nextensions:", cur.fetchall())

cur.execute("SELECT key FROM settings WHERE key LIKE 'push_sub_%' LIMIT 5")
print("\npush subs:", cur.fetchall())

cur.execute(
    """
    SELECT tgname, relname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE NOT t.tgisinternal AND relname IN (
      'ambassador_applications', 'orders', 'ambassador_withdrawal_requests'
    )
    """
)
print("\ntriggers:", cur.fetchall())

conn.close()
