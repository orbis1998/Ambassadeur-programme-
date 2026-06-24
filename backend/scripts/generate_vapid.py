#!/usr/bin/env python3
"""Generate VAPID keys and append them to backend/.env and frontend/.env."""
from __future__ import annotations

from pathlib import Path

from cryptography.hazmat.primitives import serialization

ROOT = Path(__file__).resolve().parents[1]
BACKEND_ENV = ROOT / ".env"
FRONTEND_ENV = ROOT.parent / "frontend" / ".env"
SUBJECT = "mailto:contact@vsmcollection.com"


def upsert_env(path: Path, updates: dict[str, str]) -> None:
    lines: list[str] = []
    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines()
    seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line else ""
        if key in updates:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            out.append(line)
    for key, value in updates.items():
        if key not in seen:
            out.append(f"{key}={value}")
    path.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")


def export_keys(vapid) -> tuple[str, str]:
    from py_vapid.utils import b64urlencode

    public_bytes = vapid.public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_key = b64urlencode(public_bytes)
    private_key = vapid.private_pem().decode("utf-8").replace("\n", "\\n")
    return public_key, private_key


def main() -> None:
    try:
        from py_vapid import Vapid
    except ImportError as exc:
        raise SystemExit("Install deps first: pip install py-vapid pywebpush") from exc

    vapid = Vapid()
    vapid.generate_keys()
    public_key, private_key = export_keys(vapid)

    upsert_env(BACKEND_ENV, {
        "VAPID_PUBLIC_KEY": public_key,
        "VAPID_PRIVATE_KEY": private_key,
        "VAPID_SUBJECT": SUBJECT,
    })
    upsert_env(FRONTEND_ENV, {
        "REACT_APP_VAPID_PUBLIC_KEY": public_key,
    })
    print("VAPID keys written to backend/.env and frontend/.env")


if __name__ == "__main__":
    main()
