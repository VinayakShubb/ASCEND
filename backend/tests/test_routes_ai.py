"""GROQ_API_KEY is empty in the test environment (see conftest.py), so these
exercise the real "AI unavailable" fallback paths instead of hitting a real
LLM -- no network calls, but the whole route + service stack still runs.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient

import database
import deps
from main import app
from tests.fakes import FakeSupabaseClient


@pytest.fixture
def fake_db(monkeypatch):
    fake = FakeSupabaseClient()
    monkeypatch.setattr(database, "db_client", fake)
    return fake


@pytest.fixture
def client(fake_db):
    app.dependency_overrides[deps.get_current_user] = lambda: {
        "id": "user-1",
        "email": "shub@example.com",
        "created_at": "2026-01-01T00:00:00Z",
        "user_metadata": {"username": "ShubV"},
    }
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def seed_habit(fake_db):
    fake_db.tables["habits"].append(
        {
            "id": "h1",
            "name": "Gym",
            "category": "Health",
            "difficulty": "easy",
            "frequency": "daily",
            "created_at": "2026-01-01T00:00:00Z",
            "archived": False,
            "user_id": "user-1",
        }
    )


def test_brief_falls_back_gracefully_when_groq_unavailable(client, fake_db):
    seed_habit(fake_db)
    resp = client.post("/ai/brief", json={"recent_quotes": []})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in ("elite", "solid", "slipping", "critical")
    assert body["quote"]
    assert body["motivation"]


def test_coach_returns_null_with_no_active_habits(client):
    resp = client.get("/ai/coach")
    assert resp.status_code == 200
    assert resp.json() is None


def test_coach_returns_null_when_groq_unavailable_even_with_habits(client, fake_db):
    seed_habit(fake_db)
    resp = client.get("/ai/coach")
    assert resp.status_code == 200
    assert resp.json() is None


def test_cipher_returns_null_with_no_active_habits(client):
    resp = client.get("/ai/cipher")
    assert resp.status_code == 200
    assert resp.json() is None
