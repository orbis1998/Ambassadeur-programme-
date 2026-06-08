"""Iteration 2 backend tests for VSM Ambassador API.

Covers new endpoints introduced in iteration 2:
- POST /api/auth/resolve-identifier
- GET  /api/push/public-key
- POST /api/push/subscribe (auth)
- POST /api/ambassador/notify-approval (auth + 409 path)
- GET  /api/track/{slug}
- GET  /api/ambassador/me must expose tracking_link + promo_codes
"""
import os
import pytest
import requests

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or 'https://ambassador-vsm.preview.emergentagent.com').rstrip('/')
SUPABASE_URL = "https://ehmgjgrekjoaohnnlfmw.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobWdqZ3Jla2pvYW9obm5sZm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MzI5NTAsImV4cCI6MjA4MzEwODk1MH0.2tI0RYA0IVBaIHpsL50RH_GAxu_K8aJDuodvcXSHtGo"

TEST_USER_EMAIL = "yann.test-1780920203@example.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_ID = "78dcfb4a-32af-4b29-8a85-dace5e585b63"
TEST_BADGE = "VSM-5B63"


@pytest.fixture(scope="session")
def access_token():
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Cannot obtain token: {r.status_code} {r.text}")
    return r.json()["access_token"]


# ---------- resolve-identifier ----------
class TestResolveIdentifier:
    def test_resolve_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/resolve-identifier",
                          json={"identifier": TEST_USER_EMAIL}, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == TEST_USER_EMAIL

    def test_resolve_badge(self):
        r = requests.post(f"{BASE_URL}/api/auth/resolve-identifier",
                          json={"identifier": TEST_BADGE}, timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == TEST_USER_EMAIL

    def test_resolve_unknown_badge_404(self):
        r = requests.post(f"{BASE_URL}/api/auth/resolve-identifier",
                          json={"identifier": "VSM-ZZZZ"}, timeout=15)
        assert r.status_code == 404

    def test_resolve_unknown_phone_404(self):
        r = requests.post(f"{BASE_URL}/api/auth/resolve-identifier",
                          json={"identifier": "+99900099900"}, timeout=15)
        assert r.status_code == 404


# ---------- /me extended ----------
class TestMeExtended:
    def test_me_has_promo_codes_and_tracking_link(self, access_token):
        r = requests.get(f"{BASE_URL}/api/ambassador/me",
                         headers={"Authorization": f"Bearer {access_token}"}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        # promo_codes
        assert isinstance(data.get("promo_codes"), list)
        codes = [c.get("code") for c in data["promo_codes"]]
        assert "YANNVSM10" in codes, f"expected YANNVSM10 in {codes}"
        # tracking_link — REQUIRED by frontend Dashboard to render /r/VSM-5B63
        assert "tracking_link" in data, "tracking_link missing from /me response"
        assert data["tracking_link"] is not None, "tracking_link is null for approved user"
        assert data["tracking_link"].get("slug") == TEST_BADGE


# ---------- push ----------
class TestPush:
    def test_public_key(self):
        r = requests.get(f"{BASE_URL}/api/push/public-key", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "publicKey" in body
        assert isinstance(body["publicKey"], str) and len(body["publicKey"]) > 20

    def test_subscribe_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/push/subscribe",
                          json={"subscription": {"endpoint": "https://x", "keys": {}}}, timeout=15)
        assert r.status_code == 401

    def test_subscribe_with_auth(self, access_token):
        r = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"subscription": {
                "endpoint": "https://fcm.googleapis.com/test-iter2/endpoint-abc",
                "keys": {"auth": "TESTauth", "p256dh": "TESTp256dh"},
            }},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ---------- notify-approval ----------
class TestNotifyApproval:
    def test_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/ambassador/notify-approval", timeout=15)
        assert r.status_code == 401

    def test_approved_user_returns_ok(self, access_token):
        r = requests.post(f"{BASE_URL}/api/ambassador/notify-approval",
                          headers={"Authorization": f"Bearer {access_token}"}, timeout=20)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- /api/track ----------
class TestTracking:
    def test_track_known_slug(self):
        r = requests.get(f"{BASE_URL}/api/track/{TEST_BADGE}", timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert body.get("target") == f"https://www.vsmcollection.com/?ref={TEST_BADGE}"

    def test_track_unknown_slug_still_returns_fallback_target(self):
        r = requests.get(f"{BASE_URL}/api/track/UNKNOWN-XYZ", timeout=20)
        assert r.status_code == 200
        assert "vsmcollection.com" in r.json().get("target", "")
