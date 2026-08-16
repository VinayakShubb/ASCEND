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

    resp = client.post("/habits/h1/toggle", json={"date": "2026-08-16"})
    assert resp.json()["action"] == "completed"
    assert resp.json()["log"]["status"] == "completed"
    assert len(fake_db.tables["habit_logs"]) == 1

    resp = client.post("/habits/h1/toggle", json={"date": "2026-08-16"})
    assert resp.json()["action"] == "uncompleted"
    assert resp.json()["log"] is None
    assert len(fake_db.tables["habit_logs"]) == 0


def test_toggle_is_scoped_to_the_given_date(client, fake_db):
    seed_habit(fake_db)
    client.post("/habits/h1/toggle", json={"date": "2026-08-15"})
    resp = client.post("/habits/h1/toggle", json={"date": "2026-08-16"})
    assert resp.json()["action"] == "completed"
    assert len(fake_db.tables["habit_logs"]) == 2
