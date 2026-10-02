"""Daily limits and server-side storage of AI output (routes/ai.py +
services/ai_generations.py). Groq itself is replaced by small fakes that
count how often a generation actually happens."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import config
import database
import deps
from main import app
from services import ai_brief, ai_coach
from tests.fakes import FakeSupabaseClient

TZ = {"X-Timezone": "Asia/Kolkata"}


@pytest.fixture
def fake_db(monkeypatch):
    fake = FakeSupabaseClient()
    monkeypatch.setattr(database, "db_client", fake)
    fake.tables["habits"].append(
        {
            "id": "h1",
            "name": "Gym",
            "category": "Health",
            "difficulty": "medium",
            "frequency": "daily",
            "created_at": "2026-01-01T00:00:00Z",
            "archived": False,
            "user_id": "user-1",
        }
    )
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


def cipher_output(n: int) -> dict:
    return {
        "status": "solid",
        "operatorVerdict": f"analysis {n}",
        "timelineComments": {"today": "x"},
        "executionType": "CONSISTENT BUILDER",
        "personalityInsight": "p",
        "hallOfFame": {"bestProtocol": "Gym", "bestProtocolComment": "c", "bestDayComment": "c"},
        "hallOfShame": {"worstProtocol": "Gym", "worstProtocolComment": "c", "worstStreakComment": "c"},
        "lowlightsComments": {"longestDeadStreak": "a", "worstDay": "b", "mostBrokenHabit": "c", "biggestDrop": "d"},
        "ceilingInsight": "c",
        "biggestMistakeName": "m",
        "biggestMistake": "m",
        "biggestWinName": "w",
        "biggestWin": "w",
        "orders": [{"rank": 1, "action": "a", "estimatedImpact": "+2"}],
        "analyzedAt": "2026-10-02T10:00:00+00:00",
    }


@pytest.fixture
def cipher_calls(monkeypatch):
    calls = []

    def fake_analysis(**kwargs):
        calls.append(kwargs)
        return cipher_output(len(calls))

    monkeypatch.setattr(ai_coach, "get_cipher_analysis", fake_analysis)
    monkeypatch.setattr(config, "AI_CIPHER_COOLDOWN_SECONDS", 0)
    return calls


def add_log(fake_db, date_str: str):
    fake_db.tables["habit_logs"].append(
        {"id": f"log-{date_str}-{len(fake_db.tables['habit_logs'])}", "habit_id": "h1", "date": date_str,
         "status": "completed", "user_id": "user-1"}
    )


def age_generations(fake_db, seconds: int):
    for row in fake_db.tables["ai_generations"]:
        created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        row["created_at"] = (created - timedelta(seconds=seconds)).isoformat()


# --- Daily brief (home-page motivation) ----------------------------------

def test_brief_is_generated_once_per_day_and_reused(client, fake_db, monkeypatch):
    calls = []

    def fake_brief(**kwargs):
        calls.append(kwargs)
        return {"status": "solid", "quote": f"quote {len(calls)}", "motivation": "line one\nline two"}

    monkeypatch.setattr(ai_brief, "get_daily_brief", fake_brief)

    first = client.post("/ai/brief", json={}, headers=TZ).json()
    second = client.post("/ai/brief", json={}, headers=TZ).json()

    assert first == second
    assert first["quote"] == "quote 1"
    assert len(calls) == 1
    assert len(fake_db.tables["ai_generations"]) == 1


def test_brief_fallback_is_shown_but_not_stored(client, fake_db, monkeypatch):
    monkeypatch.setattr(
        ai_brief,
        "get_daily_brief",
        lambda **kwargs: {"status": "solid", "quote": "canned", "motivation": "a\nb", "is_fallback": True},
    )

    response = client.post("/ai/brief", json={}, headers=TZ).json()

    assert response["quote"] == "canned"
    assert "is_fallback" not in response
    assert fake_db.tables["ai_generations"] == []


def test_brief_avoids_quotes_from_earlier_days(client, fake_db, monkeypatch):
    fake_db.tables["ai_generations"].append(
        {"id": "g0", "user_id": "user-1", "feature": "brief", "local_date": "2026-01-05", "input_hash": "x",
         "output": {"status": "solid", "quote": "an old quote", "motivation": "a\nb"},
         "created_at": "2026-01-05T08:00:00+00:00"}
    )
    seen = {}

    def fake_brief(**kwargs):
        seen["recent_quotes"] = kwargs["recent_quotes"]
        return {"status": "solid", "quote": "new", "motivation": "a\nb"}

    monkeypatch.setattr(ai_brief, "get_daily_brief", fake_brief)

    client.post("/ai/brief", json={"recent_quotes": ["from the browser"]}, headers=TZ)

    assert "an old quote" in seen["recent_quotes"]
    assert "from the browser" in seen["recent_quotes"]


# --- Live coach (analytics sidebar) --------------------------------------

def test_coach_is_generated_once_per_day(client, fake_db, monkeypatch):
    calls = []

    def fake_coach(username, habits, logs, today=None):
        calls.append(today)
        return {"status": "solid", "headline": "h", "insight": "i", "action": "a"}

    monkeypatch.setattr(ai_coach, "get_coach_insight", fake_coach)

    client.get("/ai/coach", headers=TZ)
    add_log(fake_db, "2026-10-01")  # even new data doesn't trigger a second coach call today
    client.get("/ai/coach", headers=TZ)

    assert len(calls) == 1


def test_coach_with_malformed_ai_output_returns_null_instead_of_500(client, monkeypatch):
    monkeypatch.setattr(ai_coach, "get_coach_insight", lambda *a, **k: {"status": "solid", "headline": "only this"})

    response = client.get("/ai/coach", headers=TZ)

    assert response.status_code == 200
    assert response.json() is None


# --- CIPHER analysis -----------------------------------------------------

def test_cipher_regenerates_when_the_users_data_changes(client, fake_db, cipher_calls):
    first = client.get("/ai/cipher", headers=TZ).json()
    add_log(fake_db, "2026-09-30")
    second = client.get("/ai/cipher", headers=TZ).json()

    assert first["operatorVerdict"] == "analysis 1"
    assert second["operatorVerdict"] == "analysis 2"
    assert len(cipher_calls) == 2


def test_cipher_reuses_the_last_analysis_when_nothing_changed(client, cipher_calls):
    client.get("/ai/cipher", headers=TZ)
    again = client.get("/ai/cipher", headers=TZ).json()

    assert again["operatorVerdict"] == "analysis 1"
    assert len(cipher_calls) == 1


def test_cipher_stops_calling_groq_after_the_daily_limit(client, fake_db, cipher_calls, monkeypatch):
    monkeypatch.setattr(config, "AI_CIPHER_DAILY_LIMIT", 3)

    results = []
    for day in range(5):
        add_log(fake_db, f"2026-09-{10 + day}")
        results.append(client.get("/ai/cipher", headers=TZ).json()["operatorVerdict"])

    assert len(cipher_calls) == 3
    # Past the limit the user just keeps seeing the latest analysis.
    assert results == ["analysis 1", "analysis 2", "analysis 3", "analysis 3", "analysis 3"]


def test_cipher_cooldown_returns_the_previous_analysis(client, fake_db, cipher_calls, monkeypatch):
    monkeypatch.setattr(config, "AI_CIPHER_COOLDOWN_SECONDS", 10)

    client.get("/ai/cipher", headers=TZ)
    add_log(fake_db, "2026-09-30")
    inside_cooldown = client.get("/ai/cipher", headers=TZ).json()
    age_generations(fake_db, 11)
    after_cooldown = client.get("/ai/cipher", headers=TZ).json()

    assert inside_cooldown["operatorVerdict"] == "analysis 1"
    assert after_cooldown["operatorVerdict"] == "analysis 2"


def test_cipher_shows_the_last_analysis_when_groq_is_down(client, fake_db, monkeypatch):
    fake_db.tables["ai_generations"].append(
        {"id": "g0", "user_id": "user-1", "feature": "cipher", "local_date": "2026-01-05", "input_hash": "x",
         "output": cipher_output(99), "created_at": "2026-01-05T08:00:00+00:00"}
    )
    monkeypatch.setattr(ai_coach, "get_cipher_analysis", lambda **kwargs: None)

    response = client.get("/ai/cipher", headers=TZ).json()

    assert response["operatorVerdict"] == "analysis 99"


def test_cipher_limits_are_per_user(client, fake_db, cipher_calls, monkeypatch):
    monkeypatch.setattr(config, "AI_CIPHER_DAILY_LIMIT", 1)
    fake_db.tables["ai_generations"].append(
        {"id": "g0", "user_id": "someone-else", "feature": "cipher",
         "local_date": datetime.now(timezone.utc).date().isoformat(), "input_hash": "x",
         "output": cipher_output(50), "created_at": datetime.now(timezone.utc).isoformat()}
    )

    response = client.get("/ai/cipher").json()

    assert response["operatorVerdict"] == "analysis 1"


def test_cipher_latest_returns_stored_analysis_without_generating(client, fake_db, cipher_calls):
    assert client.get("/ai/cipher/latest").json() is None

    client.get("/ai/cipher", headers=TZ)
    latest = client.get("/ai/cipher/latest").json()

    assert latest["operatorVerdict"] == "analysis 1"
    assert len(cipher_calls) == 1


def test_cipher_uses_the_users_local_date(client, cipher_calls):
    client.get("/ai/cipher", headers={"X-Timezone": "Pacific/Kiritimati"})

    expected = datetime.now(timezone(timedelta(hours=14))).date()
    assert cipher_calls[0]["today"] == expected


def test_ai_still_works_if_the_ai_generations_table_is_missing(client, fake_db, cipher_calls, monkeypatch):
    from postgrest.exceptions import APIError

    real_table = fake_db.table

    def table(name):
        if name == "ai_generations":
            raise APIError({"code": "42P01", "message": 'relation "ai_generations" does not exist'})
        return real_table(name)

    monkeypatch.setattr(fake_db, "table", table)

    response = client.get("/ai/cipher", headers=TZ)

    assert response.status_code == 200
    assert response.json()["operatorVerdict"] == "analysis 1"
