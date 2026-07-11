#!/usr/bin/env python3
import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

URL = os.environ.get("DATABASE_URL") or (
    "postgresql://postgres.ehmgjgrekjoaohnnlfmw:Lalune002___"
    "@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
)

sql = Path(__file__).resolve().parent / "migrations" / "020_landing_media.sql"
conn = psycopg2.connect(URL)
conn.autocommit = True
cur = conn.cursor()
cur.execute(sql.read_text(encoding="utf-8"))
cur.execute("SELECT count(*) FROM public.landing_media")
print("Migration 020 applied OK — slots:", cur.fetchone()[0])
conn.close()
