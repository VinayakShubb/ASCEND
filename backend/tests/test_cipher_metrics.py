from datetime import date, timedelta

import pytest

from services import calculations, cipher_analysis, cipher_metrics

TODAY = date(2026, 10, 2)  # a Friday


def habit(hid, name, difficulty="medium", archived=False):
    return {"id": hid, "name": name, "difficulty": difficulty, "category": "General", "archived": archived}


def logs_for(hid, days_ago):
    return [
        {"habit_id": hid, "date": (TODAY - timedelta(days=d)).isoformat(), "status": "completed"} for d in days_ago
    ]


def compute(habits, logs, registered_days_ago=90):
    created = (TODAY - timedelta(days=registered_days_ago)).isoformat() + "T00:00:00Z"
    return cipher_metrics.compute_cipher_metrics(habits, logs, TODAY, created)


# --- Discipline Index arithmetic ------------------------------------------

def test_impact_today_and_max_today_add_up_to_the_real_ceiling():
    habits = [habit("e", "Read", "easy"), habit("h", "Gym", "hard")]
    logs = logs_for("e", range(1, 7)) + logs_for("h", range(1, 7))

    m = compute(habits, logs)
    by_name = {h["name"]: h for h in m["habits"]}

    # easy 1.0 and hard 1.5 -> 40% and 60% of a day; one day = 100/7 DI.
    assert by_name["Read"]["impactToday"] == round(0.4 * 100 / 7, 1)
    assert by_name["Gym"]["impactToday"] == round(0.6 * 100 / 7, 1)

    simulated = logs + logs_for("e", [0]) + logs_for("h", [0])
    real_max = calculations.calculate_discipline_index(habits, simulated, TODAY.isoformat())
    assert m["score"]["maxToday"] == real_max == 100


def test_points_lost_counts_missed_days_this_week_but_not_today():
    habits = [habit("g", "Gym")]
    logs = logs_for("g", [1, 2, 3])  # missed 4, 5, 6 days ago; today still open

    m = compute(habits, logs)

    assert m["habits"][0]["pointsLost7"] == round(3 * 100 / 7, 1)
    assert m["habits"][0]["impactToday"] == round(100 / 7, 1)


def test_done_habits_have_no_impact_left_and_are_not_in_the_plan():
    habits = [habit("g", "Gym"), habit("r", "Read")]
    logs = logs_for("g", [0])

    m = compute(habits, logs)

    assert [p["name"] for p in m["plan"]] == ["Read"]
    assert next(h for h in m["habits"] if h["name"] == "Gym")["impactToday"] == 0


def test_plan_is_ordered_by_biggest_impact_first():
    habits = [habit("e", "Walk", "easy"), habit("x", "Sprint", "extreme"), habit("m", "Code", "medium")]

    m = compute(habits, [])

    assert [p["name"] for p in m["plan"]] == ["Sprint", "Code", "Walk"]


def test_archived_habits_are_ignored():
    habits = [habit("g", "Gym"), habit("old", "Old", archived=True)]

    m = compute(habits, [])

    assert [h["name"] for h in m["habits"]] == ["Gym"]


# --- What's working / holding back ----------------------------------------

def test_strong_habits_are_working_and_costly_misses_are_holding_back():
    habits = [habit("g", "Gym"), habit("r", "Read"), habit("m", "Meditate")]
    logs = logs_for("g", range(0, 7)) + logs_for("r", [0, 3]) + logs_for("m", range(0, 5))

    m = compute(habits, logs)

    assert [h["name"] for h in m["working"]] == ["Gym", "Meditate"]
    assert [h["name"] for h in m["holdingBack"]] == ["Read"]


def test_a_single_habit_is_never_both_working_and_holding_back():
    m = compute([habit("g", "Gym")], logs_for("g", [0, 1, 2, 3]))

    names_working = {h["name"] for h in m["working"]}
    names_holding = {h["name"] for h in m["holdingBack"]}
    assert not names_working & names_holding


# --- Windows respect the registration date --------------------------------

def test_new_user_averages_only_cover_days_since_signup():
    habits = [habit("g", "Gym")]
    m = compute(habits, logs_for("g", [0, 1]), registered_days_ago=1)

    completion = next(x for x in m["metrics"] if x["key"] == "completion")
    assert completion["value"] == "100%"
    assert m["isNewUser"] is True
    assert m["status"] != "critical"  # never "critical" in the first days


# --- Personality ----------------------------------------------------------

def test_personality_waits_for_two_weeks_of_data():
    m = compute([habit("g", "Gym")], logs_for("g", range(0, 5)), registered_days_ago=5)

    assert m["personality"]["type"] == "CALIBRATING"


def test_weekend_warrior_is_detected_with_evidence():
    days = [d for d in range(1, 43) if (TODAY - timedelta(days=d)).weekday() >= 5]
    m = compute([habit("g", "Gym")], logs_for("g", days), registered_days_ago=42)

    assert m["personality"]["type"] == "WEEKEND WARRIOR"
    assert "Weekends 100% vs weekdays 0%" in m["personality"]["evidence"]


def test_burst_executor_has_strong_days_but_mostly_zeros():
    days = [d for d in range(1, 43) if d % 3 == 0]  # every 3rd day: spread across weekdays
    m = compute([habit("g", "Gym")], logs_for("g", days), registered_days_ago=42)

    assert m["personality"]["type"] == "BURST EXECUTOR"


def test_consistent_user_is_a_consistent_builder():
    habits = [habit("g", "Gym"), habit("r", "Read")]
    logs = logs_for("g", range(0, 40)) + logs_for("r", [d for d in range(0, 40) if d % 3])

    m = compute(habits, logs, registered_days_ago=40)

    assert m["personality"]["type"] == "CONSISTENT BUILDER"


# --- Weekday pattern ------------------------------------------------------

def test_best_and_worst_weekday_come_from_history():
    fridays = [d for d in range(1, 57) if (TODAY - timedelta(days=d)).weekday() == 4]
    other = [d for d in range(1, 57) if (TODAY - timedelta(days=d)).weekday() in (0, 1, 2, 3, 5)]
    m = compute([habit("g", "Gym")], logs_for("g", fridays + other[::2]), registered_days_ago=60)

    assert m["bestWeekday"] == "Fri"
    assert m["worstWeekday"] == "Sun"


def test_no_weekday_pattern_for_new_users():
    m = compute([habit("g", "Gym")], logs_for("g", [1, 2]), registered_days_ago=3)

    assert m["bestWeekday"] is None


# --- Changes since last analysis ------------------------------------------

def test_changes_lists_only_what_moved():
    before = {"di": 40, "completion7": 50, "activeDays7": 4, "topStreak": 3, "doneToday": 1}
    after = {"di": 46, "completion7": 50, "activeDays7": 4, "topStreak": 2, "doneToday": 2}

    changes = cipher_metrics.changes_since(before, after)

    assert changes == [
        {"label": "Discipline Index", "delta": "+6", "direction": "up"},
        {"label": "Top streak", "delta": "-1d", "direction": "down"},
        {"label": "Done today", "delta": "+1", "direction": "up"},
    ]
    assert cipher_metrics.changes_since(None, after) == []


# --- Analysis assembly ----------------------------------------------------

@pytest.fixture
def metrics():
    habits = [habit("g", "Gym", "hard"), habit("r", "Read", "easy")]
    logs = logs_for("g", range(0, 20)) + logs_for("r", [5, 9])
    return compute(habits, logs, registered_days_ago=30)


def test_without_ai_every_section_still_has_plain_text(metrics):
    analysis = cipher_analysis.build_analysis("Vinayak", metrics, None)

    assert analysis["narrative"] is False
    assert analysis["verdict"].startswith("Vinayak,")
    assert all(item["note"] for item in analysis["working"] + analysis["holdingBack"])
    assert all(item["action"] for item in analysis["plan"])


def test_ai_text_is_cleaned_but_numbers_always_come_from_python(metrics):
    ai = {
        "verdict": "Vinayak, you are on fire — DI is 99 now",
        "habitNotes": {"Read": "Read  is\nslipping badly"},
        "planActions": {"Read": "Read ten pages before bed tonight, phone in the other room."},
    }

    analysis = cipher_analysis.build_analysis("Vinayak", metrics, ai)

    assert "—" not in analysis["verdict"]
    assert analysis["score"]["value"] == metrics["score"]["value"]  # not 99
    read = next(h for h in analysis["holdingBack"] if h["name"] == "Read")
    assert read["note"] == "Read is slipping badly."
    plan_read = next(p for p in analysis["plan"] if p["name"] == "Read")
    assert plan_read["impact"] == metrics["plan"][0]["impact"] or plan_read["impact"] > 0


def test_prompt_contains_only_computed_numbers_and_no_old_jargon(metrics):
    prompt = cipher_analysis.build_prompt("Vinayak", metrics)

    assert str(metrics["score"]["value"]) in prompt
    assert "Gym" in prompt and "Read" in prompt
    assert "operator" not in prompt.split("Do not use the words")[0].lower()
