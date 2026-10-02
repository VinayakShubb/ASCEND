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


def test_supabase_clients_retry_dropped_connections():
    import httpx

    import database

    for client in (database.db_client.postgrest.session, database.auth_client.auth._http_client):
        assert isinstance(client._transport, database.RetryTransport)

    class Flaky(httpx.BaseTransport):
        calls = 0

        def handle_request(self, request):
            Flaky.calls += 1
            if Flaky.calls == 1:
                raise httpx.RemoteProtocolError("Server disconnected")
            return httpx.Response(200, json={"ok": True})

    client = httpx.Client(transport=database.RetryTransport(Flaky()))
    assert client.get("https://example.test/").json() == {"ok": True}
    assert Flaky.calls == 2


def test_retry_gives_up_after_its_limit():
    import httpx
    import pytest

    import database

    class Down(httpx.BaseTransport):
        def handle_request(self, request):
            raise httpx.RemoteProtocolError("Server disconnected")

    with pytest.raises(httpx.RemoteProtocolError):
        httpx.Client(transport=database.RetryTransport(Down(), retries=2)).get("https://example.test/")


def test_unreachable_auth_service_is_503_not_401(monkeypatch):
    import httpx
    import pytest
    from fastapi import HTTPException

    def get_user(token):
        raise httpx.RemoteProtocolError("Server disconnected")

    monkeypatch.setattr(database, "auth_client", SimpleNamespace(auth=SimpleNamespace(get_user=get_user)))
    monkeypatch.setattr(deps, "_token_cache", {})

    with pytest.raises(HTTPException) as exc:
        deps.get_current_user("Bearer some-token")
    assert exc.value.status_code == 503
