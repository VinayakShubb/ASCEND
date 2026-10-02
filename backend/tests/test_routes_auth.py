from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import database
from main import app
from routes import auth as auth_routes
from services import rate_limit
from tests.fakes import FakeSupabaseClient


class FakeAuthApi:
    """Stands in for auth_client.auth. Behaviour is set per test."""

    def __init__(self):
        self.sign_in_error: Exception | None = None
        self.sign_up_error: Exception | None = None
        self.sign_up_calls: list[dict] = []

    def _session(self, email: str):
        user = SimpleNamespace(
            id="new-user-id", email=email, user_metadata={"username": "Fresh"}, created_at="2026-10-01T00:00:00Z"
        )
        session = SimpleNamespace(access_token="access", refresh_token="refresh", expires_at=1999999999)
        return SimpleNamespace(user=user, session=session)

    def sign_in_with_password(self, credentials: dict):
        if self.sign_in_error:
            raise self.sign_in_error
        return self._session(credentials["email"])

    def sign_up(self, payload: dict):
        self.sign_up_calls.append(payload)
        if self.sign_up_error:
            raise self.sign_up_error
        return self._session(payload["email"])


@pytest.fixture
def fake_db(monkeypatch):
    fake = FakeSupabaseClient()
    monkeypatch.setattr(database, "db_client", fake)
    return fake


@pytest.fixture
def fake_auth(monkeypatch):
    api = FakeAuthApi()
    monkeypatch.setattr(database, "auth_client", SimpleNamespace(auth=api))
    return api


@pytest.fixture(autouse=True)
def reset_rate_limits():
    for limiter in (
        rate_limit.login_ip_limiter,
        rate_limit.login_identifier_limiter,
        rate_limit.register_ip_limiter,
        rate_limit.refresh_ip_limiter,
    ):
        limiter.reset()


@pytest.fixture
def client(fake_db, fake_auth):
    with TestClient(app) as test_client:
        yield test_client


def register_body(**overrides):
    body = {"email": "Fresh@Example.com", "password": "longenough1", "username": "fresh_user"}
    body.update(overrides)
    return body


# --- Registration --------------------------------------------------------

def test_register_never_stores_the_password(client, fake_db):
    response = client.post("/auth/register", json=register_body())

    assert response.status_code == 200
    assert response.json()["access_token"] == "access"
    profile = fake_db.tables["profiles"][0]
    assert "password_plain" not in profile
    assert "longenough1" not in str(profile)


def test_register_lowercases_the_email(client, fake_db, fake_auth):
    client.post("/auth/register", json=register_body())

    assert fake_auth.sign_up_calls[0]["email"] == "fresh@example.com"
    assert fake_db.tables["profiles"][0]["email"] == "fresh@example.com"


def test_register_rejects_a_taken_username(client, fake_db, fake_auth):
    fake_db.tables["profiles"].append({"id": "someone", "username": "fresh_user", "email": "x@example.com"})

    response = client.post("/auth/register", json=register_body())

    assert response.json()["error"] == auth_routes.USERNAME_TAKEN
    assert fake_auth.sign_up_calls == []


def test_register_rolls_back_the_auth_user_when_the_username_race_is_lost(client, fake_db, monkeypatch):
    # Simulate another signup grabbing the username between the pre-check and
    # the profile insert: the pre-check sees nothing, the insert collides.
    real_table = fake_db.table
    calls = {"profiles": 0}

    def table(name):
        query = real_table(name)
        if name == "profiles":
            calls["profiles"] += 1
            if calls["profiles"] == 2:
                fake_db.tables["profiles"].append({"id": "racer", "username": "fresh_user", "email": "r@example.com"})
        return query

    monkeypatch.setattr(fake_db, "table", table)

    response = client.post("/auth/register", json=register_body())

    assert response.json()["error"] == auth_routes.USERNAME_TAKEN
    assert fake_db.auth.admin.deleted_user_ids == ["new-user-id"]


@pytest.mark.parametrize(
    "overrides, expected_fragment",
    [
        ({"password": "short"}, "at least 8 characters"),
        ({"username": "ab"}, "User ID must be"),
        ({"username": "has space"}, "User ID must be"),
        ({"email": "not-an-email"}, "valid email"),
    ],
)
def test_register_validation_errors_come_back_as_a_readable_error(client, overrides, expected_fragment):
    response = client.post("/auth/register", json=register_body(**overrides))

    assert response.status_code == 422
    assert expected_fragment in response.json()["error"]


def test_register_hides_unexpected_supabase_errors(client, fake_auth):
    fake_auth.sign_up_error = Exception("connection to db-internal-host:5432 refused")

    response = client.post("/auth/register", json=register_body())

    assert response.json()["error"] == auth_routes.GENERIC_AUTH_ERROR
    assert "5432" not in response.text


def test_register_is_rate_limited_per_ip(client):
    for i in range(5):
        client.post("/auth/register", json=register_body(username=f"user_{i}", email=f"u{i}@example.com"))

    response = client.post("/auth/register", json=register_body(username="user_x", email="ux@example.com"))

    assert response.status_code == 429
    assert "Too many attempts" in response.json()["error"]


# --- Login ---------------------------------------------------------------

def test_unknown_username_and_wrong_password_get_the_same_message(client, fake_db, fake_auth):
    unknown = client.post("/auth/login", json={"identifier": "nobody", "password": "whatever"}).json()

    fake_db.tables["profiles"].append({"id": "u1", "username": "real_user", "email": "real@example.com"})
    fake_auth.sign_in_error = Exception("Invalid login credentials")
    wrong_password = client.post("/auth/login", json={"identifier": "real_user", "password": "wrong"}).json()

    assert unknown["error"] == wrong_password["error"] == auth_routes.INVALID_CREDENTIALS


def test_login_by_username_uses_the_profile_email(client, fake_db):
    fake_db.tables["profiles"].append({"id": "u1", "username": "real_user", "email": "real@example.com"})

    response = client.post("/auth/login", json={"identifier": "real_user", "password": "pw"})

    assert response.json()["access_token"] == "access"


def test_login_is_rate_limited_per_account(client, fake_auth):
    fake_auth.sign_in_error = Exception("Invalid login credentials")
    for _ in range(10):
        client.post("/auth/login", json={"identifier": "target@example.com", "password": "guess"})

    response = client.post("/auth/login", json={"identifier": "target@example.com", "password": "guess"})

    assert response.status_code == 429
    assert "Too many attempts" in response.json()["error"]


def test_login_still_accepts_short_legacy_passwords(client):
    response = client.post("/auth/login", json={"identifier": "old@example.com", "password": "abc123"})

    assert response.status_code == 200
    assert response.json()["access_token"] == "access"
