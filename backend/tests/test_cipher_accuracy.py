"""Accuracy tests for every number CIPHER shows.

Two independent checks:
1. A deliberately simple reference implementation (brute-force loops, no
   shared code with services/) must agree with the real engine.
2. "What if" numbers (impact, points lost, max today, projection) are checked
   by actually simulating the extra completions and recomputing the
   Discipline Index from scratch.

Hypothesis generates hundreds of random users per property: random habit
counts and difficulties, archived habits, duplicate and non-completed logs,
brand-new and long-time accounts.
"""

import random
from datetime import date, timedelta

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from services import calculations, cipher_analysis, cipher_metrics

MULT = {"easy": 1.0, "medium": 1.2, "hard": 1.5, "extreme": 2.0}
SETTINGS = settings(max_examples=250, deadline=None, suppress_health_check=[HealthCheck.too_slow])


# --------------------------------------------------------------------------
# Reference implementation (independent of services/)
# --------------------------------------------------------------------------

def ref_done(logs):
    return {(l["habit_id"], l["date"]) for l in logs if l["status"] == "completed"}


def ref_active(habits):
    return [h for h in habits if not h["archived"]]


def ref_score(habits, logs, d: date) -> float:
    active = ref_active(habits)
    if not active:
        return 0.0
    done = ref_done(logs)
    total = sum(MULT[h["difficulty"]] for h in active)
    earned = sum(MULT[h["difficulty"]] for h in active if (h["id"], d.isoformat()) in done)
    return earned / total * 100


def ref_pct(habits, logs, d: date) -> float:
    active = ref_active(habits)
    if not active:
        return 0.0
    done = ref_done(logs)
    return sum(1 for h in active if (h["id"], d.isoformat()) in done) / len(active) * 100


def ref_di_exact(habits, logs, end: date, start: date | None = None) -> float:
    days = [end - timedelta(days=i) for i in range(7)]
    if start is not None:
        if end < start:
            return 0.0
        days = [d for d in days if d >= start]
    return sum(ref_score(habits, logs, d) for d in days) / len(days)


def ref_streak(habit_id, logs, today: date) -> int:
    done = {d for (h, d) in ref_done(logs) if h == habit_id}
    day = today if today.isoformat() in done else today - timedelta(days=1)
    count = 0
    while day.isoformat() in done:
        count += 1
        day -= timedelta(days=1)
    return count


def ref_window(today: date, n: int, start: date) -> list[date]:
    days = [today - timedelta(days=i) for i in range(n)]
    return sorted(d for d in days if d >= start) or [today]


def ref_start(created_at_day: date, logs, today: date) -> date:
    dates = [date.fromisoformat(d) for (_, d) in ref_done(logs)]
    return min([created_at_day, today, *dates])


# --------------------------------------------------------------------------
# Random users
# --------------------------------------------------------------------------

TODAY = date(2026, 10, 2)


@st.composite
def users(draw):
    n_habits = draw(st.integers(min_value=1, max_value=6))
    habits = [
        {
            "id": f"h{i}",
            "name": f"Habit {i}",
            "category": "General",
            "difficulty": draw(st.sampled_from(list(MULT))),
            "archived": draw(st.booleans()) if i > 0 else False,  # at least one active
        }
        for i in range(n_habits)
    ]
    history = draw(st.integers(min_value=0, max_value=90))
    density = draw(st.floats(min_value=0.0, max_value=1.0))
    rng = random.Random(draw(st.integers(min_value=0, max_value=10_000)))
    logs = []
    for h in habits:
        for back in range(history + 1):
            if rng.random() < density:
                d = (TODAY - timedelta(days=back)).isoformat()
                status = "completed" if rng.random() < 0.9 else rng.choice(["missed", "skipped"])
                logs.append({"habit_id": h["id"], "date": d, "status": status})
                if rng.random() < 0.05:  # legacy duplicate row
                    logs.append({"habit_id": h["id"], "date": d, "status": status})
    rng.shuffle(logs)
    signup_back = draw(st.integers(min_value=0, max_value=120))
    created_at = (TODAY - timedelta(days=signup_back)).isoformat() + "T08:30:00Z"
    return habits, logs, created_at


def run(habits, logs, created_at):
    return cipher_metrics.compute_cipher_metrics(habits, logs, TODAY, created_at)


def with_completions(logs, habit_id, days):
    return logs + [{"habit_id": habit_id, "date": d.isoformat(), "status": "completed"} for d in days]


# --------------------------------------------------------------------------
# Core calculations vs reference
# --------------------------------------------------------------------------

@SETTINGS
@given(users())
def test_core_calculations_match_reference(user):
    habits, logs, _ = user
    for back in range(0, 10):
        d = TODAY - timedelta(days=back)
        score = calculations.calculate_weighted_score(habits, logs, d.isoformat())
        pct = calculations.calculate_daily_completion(habits, logs, d.isoformat())
        assert abs(score - ref_score(habits, logs, d)) < 1e-9
        assert abs(pct - ref_pct(habits, logs, d)) < 1e-9
        assert 0 <= score <= 100 and 0 <= pct <= 100
    assert calculations.calculate_discipline_index(habits, logs, TODAY.isoformat()) == round(ref_di_exact(habits, logs, TODAY))
    for h in habits:
        assert calculations.get_streak(h["id"], logs, TODAY.isoformat()) == ref_streak(h["id"], logs, TODAY)


@SETTINGS
@given(users())
def test_headline_numbers_match_reference(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    start = ref_start(date.fromisoformat(created_at[:10]), logs, TODAY)
    w7, w30 = ref_window(TODAY, 7, start), ref_window(TODAY, 30, start)

    assert m["daysTracked"] == (TODAY - start).days + 1
    assert m["score"]["value"] == round(ref_di_exact(habits, logs, TODAY, start))
    assert m["score"]["weekAgo"] == round(ref_di_exact(habits, logs, TODAY - timedelta(days=7), start))
    assert m["score"]["momentum"] == m["score"]["value"] - m["score"]["weekAgo"]
    assert m["score"]["baseline"] == round(sum(ref_score(habits, logs, d) for d in w30) / len(w30))

    metrics = {x["key"]: x for x in m["metrics"]}
    completion7 = round(sum(ref_pct(habits, logs, d) for d in w7) / len(w7))
    assert metrics["completion"]["value"] == f"{completion7}%"
    active7 = sum(1 for d in w7 if ref_pct(habits, logs, d) > 0)
    assert metrics["consistency"]["value"] == f"{active7}/{len(w7)}"

    assert [d["score"] for d in m["daily7"]] == [round(ref_score(habits, logs, TODAY - timedelta(days=i))) for i in range(6, -1, -1)]
    assert m["daily7"][-1]["isToday"] and not any(d["isToday"] for d in m["daily7"][:-1])


@SETTINGS
@given(users())
def test_per_habit_numbers_match_reference(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    start = ref_start(date.fromisoformat(created_at[:10]), logs, TODAY)
    w7, w30 = ref_window(TODAY, 7, start), ref_window(TODAY, 30, start)
    done = ref_done(logs)

    stats = {h["id"]: h for h in m["habits"]}
    assert set(stats) == {h["id"] for h in ref_active(habits)}
    for h in ref_active(habits):
        s = stats[h["id"]]
        d7 = sum(1 for d in w7 if (h["id"], d.isoformat()) in done)
        d30 = sum(1 for d in w30 if (h["id"], d.isoformat()) in done)
        assert s["done7"] == d7
        assert s["rate7"] == round(d7 / len(w7) * 100)
        assert s["rate30"] == round(d30 / len(w30) * 100)
        assert s["streak"] == ref_streak(h["id"], logs, TODAY)
        assert s["doneToday"] == ((h["id"], TODAY.isoformat()) in done)
        assert s["status"] == ("on track" if s["rate7"] >= 70 else "building" if s["rate7"] >= 40 else "slipping")


# --------------------------------------------------------------------------
# "What if" numbers, verified by simulation
# --------------------------------------------------------------------------

@SETTINGS
@given(users())
def test_impact_today_equals_simulated_di_gain(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    start = ref_start(date.fromisoformat(created_at[:10]), logs, TODAY)
    base = ref_di_exact(habits, logs, TODAY, start)
    for h in m["habits"]:
        if h["doneToday"]:
            assert h["impactToday"] == 0
            continue
        gained = ref_di_exact(habits, with_completions(logs, h["id"], [TODAY]), TODAY, start) - base
        assert h["impactToday"] == round(gained, 1)


@SETTINGS
@given(users())
def test_points_lost_equals_simulated_di_if_misses_were_done(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    start = ref_start(date.fromisoformat(created_at[:10]), logs, TODAY)
    base = ref_di_exact(habits, logs, TODAY, start)
    done = ref_done(logs)
    for h in m["habits"]:
        missed = [
            d
            for i in range(1, 7)
            for d in [TODAY - timedelta(days=i)]
            if d >= start and (h["id"], d.isoformat()) not in done
        ]
        recovered = ref_di_exact(habits, with_completions(logs, h["id"], missed), TODAY, start) - base
        assert h["pointsLost7"] == round(recovered, 1)
        assert len(h["missedDays"]) == len(missed)


@SETTINGS
@given(users())
def test_max_today_equals_di_with_everything_done_today(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    start = ref_start(date.fromisoformat(created_at[:10]), logs, TODAY)
    all_done = logs + [
        {"habit_id": h["id"], "date": TODAY.isoformat(), "status": "completed"} for h in ref_active(habits)
    ]
    assert m["score"]["maxToday"] == min(100, round(ref_di_exact(habits, all_done, TODAY, start)))
    assert m["score"]["maxToday"] >= m["score"]["value"]
    # The ceiling endpoint uses the same definition.
    assert m["score"]["maxToday"] == min(
        100, calculations.calculate_discipline_index(habits, all_done, TODAY.isoformat(), start_date=start)
    )


@SETTINGS
@given(users())
def test_focus_projection_equals_simulated_di(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    focus = m["focus"]
    if focus is None:
        return
    h = next(x for x in m["habits"] if x["name"] == focus["name"])
    done = ref_done(logs)
    week = [TODAY - timedelta(days=i) for i in range(7)]
    current = sum(1 for d in week if (h["id"], d.isoformat()) in done)
    missing = [d for d in week if (h["id"], d.isoformat()) not in done]
    assert focus["current"] == current
    assert current < focus["target"] <= 7
    simulated = with_completions(logs, h["id"], missing[: focus["target"] - current])
    start = ref_start(date.fromisoformat(created_at[:10]), logs, TODAY)
    assert focus["projectedDi"] == min(100, round(ref_di_exact(habits, simulated, TODAY, start)))
    assert focus["projectedDi"] >= m["score"]["value"]


# --------------------------------------------------------------------------
# Selection rules and invariants
# --------------------------------------------------------------------------

@SETTINGS
@given(users())
def test_selection_rules(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    open_habits = [h for h in m["habits"] if not h["doneToday"]]

    # Plan: only open habits, biggest impact first, at most 3.
    assert len(m["plan"]) == min(3, len(open_habits))
    impacts = [p["impact"] for p in m["plan"]]
    assert impacts == sorted(impacts, reverse=True)
    if open_habits:
        assert impacts[0] == max(h["impactToday"] for h in open_habits)
    assert all(not next(h for h in m["habits"] if h["id"] == p["habitId"])["doneToday"] for p in m["plan"])

    # Working / holding back: disjoint, rules respected.
    working = {h["id"] for h in m["working"]}
    holding = {h["id"] for h in m["holdingBack"]}
    assert not working & holding
    assert all(h["rate7"] >= 50 for h in m["working"])
    assert all(h["pointsLost7"] > 0 for h in m["holdingBack"])

    # Streaks at risk: alive (>= 2) and not yet done today.
    for r in m["atRisk"]:
        h = next(x for x in m["habits"] if x["name"] == r["name"])
        assert r["streak"] == h["streak"] >= 2 and not h["doneToday"]

    # Status follows the Discipline Index bands.
    di = m["score"]["value"]
    expected = "elite" if di >= 80 else "solid" if di >= 50 else "slipping" if di >= 20 or m["isNewUser"] else "critical"
    assert m["status"] == expected


@SETTINGS
@given(users())
def test_duplicates_order_and_irrelevant_logs_change_nothing(user):
    habits, logs, created_at = user
    baseline = run(habits, logs, created_at)

    shuffled = list(logs)
    random.Random(1).shuffle(shuffled)
    duplicated = logs + [dict(l) for l in logs[: len(logs) // 3]]
    archived_ids = [h["id"] for h in habits if h["archived"]]
    noise = logs + [{"habit_id": aid, "date": TODAY.isoformat(), "status": "completed"} for aid in archived_ids[:1]]

    for variant in (shuffled, duplicated):
        assert run(habits, variant, created_at) == baseline
    if archived_ids:
        # A log on an archived habit may move the tracking start date only if
        # it is the earliest log, so compare the numbers that matter.
        other = run(habits, noise, created_at)
        assert other["score"] == baseline["score"] and other["habits"] == baseline["habits"]


@SETTINGS
@given(users())
def test_explanations_quote_the_same_numbers(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    metrics = {x["key"]: x for x in m["metrics"]}

    total_done = sum(h["done7"] for h in m["habits"])
    assert f"You completed {total_done} of " in metrics["completion"]["explain"]
    assert f"went from {m['score']['weekAgo']} to {m['score']['value']}" in metrics["momentum"]["explain"]
    if any(not h["doneToday"] for h in m["habits"]):
        assert f"+{m['score']['maxToday'] - m['score']['value']}" in m["score"]["explain"]["maxToday"]
    for d in m["daily7"]:
        if d["tracked"]:
            assert str(d["score"]) in m["score"]["explain"]["value"]
    for h in m["habits"]:
        if h["missedDays"]:
            assert f"cost {h['pointsLost7']} DI in total" in h["lossExplain"]
            assert "misss" not in h["lossExplain"]


@SETTINGS
@given(users())
def test_analysis_numbers_never_come_from_the_ai(user):
    habits, logs, created_at = user
    m = run(habits, logs, created_at)
    hostile_ai = {
        "headline": "Perfect 100 score",
        "verdict": "You scored 100 and lost 999 points — amazing",
        "habitNotes": {h["name"]: "99% done" for h in m["habits"]},
        "planActions": {p["name"]: "Do it" for p in m["plan"]},
    }
    a = cipher_analysis.build_analysis("User", m, hostile_ai)

    assert a["score"] == m["score"]
    assert a["metrics"] == m["metrics"]
    assert [p["impact"] for p in a["plan"]] == [p["impact"] for p in m["plan"]]
    assert [h["pointsLost7"] for h in a["habits"]] == [h["pointsLost7"] for h in m["habits"]]
    assert "—" not in a["verdict"]
