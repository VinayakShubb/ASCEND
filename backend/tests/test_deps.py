from datetime import datetime, timezone
from types import SimpleNamespace

import database
import deps


def test_user_today_follows_the_timezone_header():
    # UTC+14 and UTC-12 are 26 hours apart, so their dates always differ.
    ahead = deps.get_user_today("Pacific/Kiritimati")
    behind = deps.get_user_today("Etc/GMT+12")

    assert (ahead - behind).days in (1, 2)


def test_user_today_falls_back_to_utc_for_missing_or_unknown_timezones():
    utc_today = datetime.now(timezone.utc).date()

    assert deps.get_user_today(None) == utc_today
    assert deps.get_user_today("Not/AZone") == utc_today
    assert deps.get_user_today("../../etc/passwd") == utc_today


def test_verified_tokens_are_cached_briefly(monkeypatch):
    calls = []

    def get_user(token):
        calls.append(token)
        user = SimpleNamespace(id="u1", email="a@example.com", created_at="2026-01-01T00:00:00Z", user_metadata={})
        return SimpleNamespace(user=user)

    monkeypatch.setattr(database, "auth_client", SimpleNamespace(auth=SimpleNamespace(get_user=get_user)))
    monkeypatch.setattr(deps, "_token_cache", {})

    first = deps.get_current_user("Bearer token-abc")
    second = deps.get_current_user("Bearer token-abc")

    assert first == second
    assert calls == ["token-abc"]


def test_client_ip_prefers_the_forwarded_header():
    request = SimpleNamespace(headers={"x-forwarded-for": "203.0.113.7, 10.0.0.1"}, client=SimpleNamespace(host="10.0.0.1"))

    assert deps.get_client_ip(request) == "203.0.113.7"


def test_requests_without_a_token_get_401_not_422():
    from fastapi.testclient import TestClient

    from main import app

    with TestClient(app) as client:
        assert client.get("/habits").status_code == 401
