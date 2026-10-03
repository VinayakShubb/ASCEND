from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

import database
import deps
from main import app
from tests.fakes import FakeSupabaseClient

# Habits can only be toggled on the current day (plus one day of timezone
# slack), so tests log against "today" rather than a fixed past date.
TODAY = deps.get_user_today(None)
TODAY_STR = TODAY.isoformat()
TOMORROW_STR = (TODAY + timedelta(days=1)).isoformat()


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


def seed_habit(fake_db, **overrides):
    habit = {
        "id": "h1",
        "name": "Gym",
        "category": "Health",
        "difficulty": "medium",
        "frequency": "daily",
        "created_at": "2026-01-01T00:00:00Z",
        "archived": False,
        "user_id": "user-1",
    }
    habit.update(overrides)
    fake_db.tables["habits"].append(habit)
    return habit


def test_create_and_list_habit(client):
    resp = client.post(
        "/habits", json={"name": "Gym", "category": "Health", "difficulty": "hard", "frequency": "daily"}
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Gym"

    resp = client.get("/habits")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_create_habit_with_blank_name_silently_no_ops(client):
    resp = client.post(
        "/habits", json={"name": "   ", "category": "Health", "difficulty": "easy", "frequency": "daily"}
    )
    assert resp.status_code == 200
    assert resp.json() is None

    resp = client.get("/habits")
    assert resp.json() == []


def test_list_habits_filters_out_junk_names(client, fake_db):
    seed_habit(fake_db, id="junk", name="NaN")
    seed_habit(fake_db, id="good", name="Gym")

    resp = client.get("/habits")
    names = [h["name"] for h in resp.json()]
    assert names == ["Gym"]


def test_update_habit(client, fake_db):
    seed_habit(fake_db)
    resp = client.patch("/habits/h1", json={"archived": True})
    assert resp.status_code == 200
    assert resp.json()["archived"] is True


def test_cannot_update_another_users_habit(client, fake_db):
    seed_habit(fake_db, user_id="someone-else")
    resp = client.patch("/habits/h1", json={"archived": True})
    assert resp.status_code == 404


def test_delete_habit(client, fake_db):
    seed_habit(fake_db)
    resp = client.delete("/habits/h1")
    assert resp.status_code == 200
    assert fake_db.tables["habits"] == []


def test_toggle_habit_completion_creates_then_removes_log(client, fake_db):
    seed_habit(fake_db)

    resp = client.post("/habits/h1/toggle", json={"date": TODAY_STR})
    assert resp.json()["action"] == "completed"
    assert resp.json()["log"]["status"] == "completed"
    assert len(fake_db.tables["habit_logs"]) == 1

    resp = client.post("/habits/h1/toggle", json={"date": TODAY_STR})
    assert resp.json()["action"] == "uncompleted"
    assert resp.json()["log"] is None
    assert len(fake_db.tables["habit_logs"]) == 0


def test_toggle_is_scoped_to_the_given_date(client, fake_db):
    seed_habit(fake_db)
    client.post("/habits/h1/toggle", json={"date": TOMORROW_STR})
    resp = client.post("/habits/h1/toggle", json={"date": TODAY_STR})
    assert resp.json()["action"] == "completed"
    assert len(fake_db.tables["habit_logs"]) == 2


def test_cannot_toggle_another_users_habit(client, fake_db):
    seed_habit(fake_db, user_id="someone-else")

    resp = client.post("/habits/h1/toggle", json={"date": TODAY_STR})

    assert resp.status_code == 404
    assert fake_db.tables["habit_logs"] == []


def test_cannot_toggle_a_habit_that_does_not_exist(client, fake_db):
    resp = client.post("/habits/missing/toggle", json={"date": TODAY_STR})

    assert resp.status_code == 404


def test_toggle_rejects_dates_far_in_the_future(client, fake_db):
    seed_habit(fake_db)

    resp = client.post("/habits/h1/toggle", json={"date": "2999-01-01"})

    assert resp.status_code == 422
    assert fake_db.tables["habit_logs"] == []


def test_toggle_rejects_past_dates(client, fake_db):
    seed_habit(fake_db)

    yesterday = (TODAY - timedelta(days=1)).isoformat()
    resp = client.post("/habits/h1/toggle", json={"date": yesterday})

    assert resp.status_code == 422
    assert fake_db.tables["habit_logs"] == []


def test_toggle_rejects_malformed_dates(client, fake_db):
    seed_habit(fake_db)

    resp = client.post("/habits/h1/toggle", json={"date": "16/08/2026"})

    assert resp.status_code == 422


def test_toggle_off_removes_old_duplicate_logs_too(client, fake_db):
    # Duplicates that slipped in before the UNIQUE(habit_id, date) constraint.
    seed_habit(fake_db)
    for log_id in ("l1", "l2"):
        fake_db.tables["habit_logs"].append(
            {"id": log_id, "habit_id": "h1", "date": TODAY_STR, "status": "completed", "user_id": "user-1"}
        )

    resp = client.post("/habits/h1/toggle", json={"date": TODAY_STR})

    assert resp.json()["action"] == "uncompleted"
    assert fake_db.tables["habit_logs"] == []


def test_toggle_double_tap_race_reports_completed(client, fake_db, monkeypatch):
    # The other request inserts its log after our "does it exist?" check but
    # before our insert, so our insert hits the unique constraint.
    seed_habit(fake_db)
    real_table = fake_db.table
    log_queries = {"n": 0}

    def table(name):
        query = real_table(name)
        if name == "habit_logs":
            log_queries["n"] += 1
            if log_queries["n"] == 2:
                fake_db.tables["habit_logs"].append(
                    {"id": "other", "habit_id": "h1", "date": TODAY_STR, "status": "completed",
                     "user_id": "user-1", "timestamp": "2026-08-16T10:00:00Z"}
                )
        return query

    monkeypatch.setattr(fake_db, "table", table)

    resp = client.post("/habits/h1/toggle", json={"date": TODAY_STR})

    assert resp.status_code == 200
    assert resp.json()["action"] == "completed"
    assert len(fake_db.tables["habit_logs"]) == 1


def test_habit_names_have_a_length_limit(client):
    resp = client.post(
        "/habits", json={"name": "x" * 61, "category": "Health", "difficulty": "easy", "frequency": "daily"}
    )

    assert resp.status_code == 422


def test_update_rejects_a_blank_name(client, fake_db):
    seed_habit(fake_db)

    resp = client.patch("/habits/h1", json={"name": "   "})

    assert resp.status_code == 422
    assert fake_db.tables["habits"][0]["name"] == "Gym"
