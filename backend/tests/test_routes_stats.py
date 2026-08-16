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


def seed_completed_today(fake_db):
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
    fake_db.tables["habit_logs"].append(
        {
            "id": "l1",
            "habit_id": "h1",
            "date": date.today().isoformat(),
            "status": "completed",
            "timestamp": "2026-01-01T00:00:00Z",
            "user_id": "user-1",
        }
    )


def test_stats_summary_reflects_seeded_data(client, fake_db):
    seed_completed_today(fake_db)
    resp = client.get("/stats/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert body["today_completion_pct"] == 100
    assert body["today_weighted_score"] == 100


def test_stats_summary_with_no_habits_is_all_zero(client):
    resp = client.get("/stats/summary")
    body = resp.json()
    assert body == {"discipline_index": 0, "today_completion_pct": 0, "today_weighted_score": 0}


def test_stats_summary_accepts_a_past_end_date(client, fake_db):
    seed_completed_today(fake_db)
    resp = client.get("/stats/summary", params={"end": "2020-01-01"})
    body = resp.json()
    # No logs existed by then, so every metric should be zero.
    assert body == {"discipline_index": 0, "today_completion_pct": 0, "today_weighted_score": 0}


def test_stats_range_returns_one_entry_per_day(client, fake_db):
    seed_completed_today(fake_db)
    resp = client.get("/stats/range", params={"start": "2026-08-10", "end": "2026-08-16"})
    assert resp.status_code == 200
    assert len(resp.json()) == 7


def test_stats_range_rejects_end_before_start(client):
    resp = client.get("/stats/range", params={"start": "2026-08-20", "end": "2026-08-01"})
    assert resp.status_code == 400


def test_stats_range_rejects_span_over_the_limit(client):
    resp = client.get("/stats/range", params={"start": "2020-01-01", "end": "2026-01-01"})
    assert resp.status_code == 400


def test_stats_streaks_only_includes_active_habits(client, fake_db):
    seed_completed_today(fake_db)
    fake_db.tables["habits"].append(
        {
            "id": "h2",
            "name": "Retired Habit",
            "category": "General",
            "difficulty": "easy",
            "frequency": "daily",
            "created_at": "2026-01-01T00:00:00Z",
            "archived": True,
            "user_id": "user-1",
        }
    )
    resp = client.get("/stats/streaks")
    body = resp.json()
    assert "h1" in body
    assert "h2" not in body
    assert body["h1"] == 1


def test_stats_ceiling_matches_when_everything_already_done(client, fake_db):
    seed_completed_today(fake_db)
    resp = client.get("/stats/ceiling")
    body = resp.json()
    assert body["current"] == body["max_today"] == 14  # 1/7 of a perfect day, rounded


def test_stats_ceiling_shows_headroom_when_habit_not_done_today(client, fake_db):
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
    resp = client.get("/stats/ceiling")
    body = resp.json()
    assert body["current"] == 0
    assert body["max_today"] == 14  # completing it today adds one day to the 7-day average


def test_stats_endpoints_require_auth():
    with TestClient(app) as client:
        resp = client.get("/stats/summary")
    assert resp.status_code in (401, 422)  # missing Authorization header
