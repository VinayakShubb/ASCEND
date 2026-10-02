"""Every number on the CIPHER page, computed in Python.

The AI never invents a figure: it only gets these results and writes short
commentary around them (services/cipher_analysis.py). That keeps the page
accurate, makes it work even when Groq is down, and keeps prompts small.

All windows are calendar days ending on the user's local `today`. Windows
used for averages never reach back before the registration date, so a new
user isn't penalised for days before they signed up. The Discipline Index
itself keeps its documented definition (always the last 7 days).
"""

from datetime import date, timedelta
from typing import Optional

from services import calculations

WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
NEW_USER_DAYS = 3
PERSONALITY_MIN_DAYS = 14

# Plain-language one-liners shown under each execution type.
PERSONALITY_TAGLINES = {
    "CALIBRATING": "Not enough history yet. Your type appears after two weeks of tracking.",
    "GHOST MODE": "The system is set up. It just isn't being used yet.",
    "BURST EXECUTOR": "Strong days, then long gaps. The ability is there, the rhythm isn't.",
    "ALL OR NOTHING": "Perfect days or zero days. A half day beats a zero day every time.",
    "SELECTIVE EXECUTOR": "The easy habits get done. The hard ones get skipped.",
    "WEEKEND WARRIOR": "Your consistency depends on the day of the week.",
    "DECLINING PERFORMER": "You started stronger than you are going now.",
    "SLOW STARTER": "A slow start, but the trend is clearly upward.",
    "EARLY QUITTER": "Strong at the start of the week, fading after.",
    "COMEBACK KID": "You fall off, and you keep coming back. That matters.",
    "CONSISTENT BUILDER": "Steady, day after day. This is the hardest pattern to build.",
}


def _window(today: date, days: int, start_limit: date) -> list[date]:
    """The last `days` calendar days ending today, oldest first, never before
    `start_limit`."""
    dates = [today - timedelta(days=i) for i in range(days - 1, -1, -1)]
    return [d for d in dates if d >= start_limit] or [today]


def _trend(delta: float, threshold: float = 2) -> str:
    if delta >= threshold:
        return "up"
    if delta <= -threshold:
        return "down"
    return "flat"


def _status_for(index: int, is_new_user: bool) -> str:
    if index >= 80:
        return "elite"
    if index >= 50:
        return "solid"
    if index >= 20 or is_new_user:
        return "slipping"
    return "critical"


def _signed(value: float) -> str:
    rounded = round(value)
    return f"+{rounded}" if rounded > 0 else str(rounded)


def _longest_streak(completed: set[str]) -> int:
    longest = current = 0
    previous: Optional[date] = None
    for day in sorted(date.fromisoformat(d) for d in completed):
        current = current + 1 if previous and day - previous == timedelta(days=1) else 1
        longest = max(longest, current)
        previous = day
    return longest


def _personality(day_rows: list[dict], habit_stats: list[dict], days_tracked: int) -> dict:
    """Execution type plus the evidence behind it. Needs two weeks of data so
    one bad week can't define someone."""
    if days_tracked < PERSONALITY_MIN_DAYS or len(day_rows) < PERSONALITY_MIN_DAYS:
        remaining = max(1, PERSONALITY_MIN_DAYS - days_tracked)
        return {
            "type": "CALIBRATING",
            "tagline": PERSONALITY_TAGLINES["CALIBRATING"],
            "evidence": f"{remaining} more day{'s' if remaining != 1 else ''} of tracking needed.",
        }

    n = len(day_rows)
    pcts = [r["pct"] for r in day_rows]
    scores = [r["score"] for r in day_rows]
    zero_days = sum(1 for p in pcts if p == 0)
    perfect_days = sum(1 for p in pcts if p == 100)
    high_days = sum(1 for p in pcts if p >= 70)
    active_days = n - zero_days
    avg_pct = round(sum(pcts) / n)

    weekend = [r["pct"] for r in day_rows if r["date"].weekday() >= 5]
    weekday = [r["pct"] for r in day_rows if r["date"].weekday() < 5]
    avg_weekend = sum(weekend) / len(weekend) if weekend else 0
    avg_weekday = sum(weekday) / len(weekday) if weekday else 0

    half = n // 2
    first_half = sum(scores[:half]) / max(1, half)
    second_half = sum(scores[half:]) / max(1, n - half)

    easy = [h["rate30"] for h in habit_stats if h["difficulty"] == "easy"]
    hard = [h["rate30"] for h in habit_stats if h["difficulty"] in ("hard", "extreme")]
    avg_easy = sum(easy) / len(easy) if easy else 0
    avg_hard = sum(hard) / len(hard) if hard else 0

    early = [r["pct"] for r in day_rows if r["date"].weekday() in (0, 1)]
    rest = [r["pct"] for r in day_rows if r["date"].weekday() not in (0, 1)]
    avg_early = sum(early) / len(early) if early else 0
    avg_rest = sum(rest) / len(rest) if rest else 0

    comebacks = 0
    run = 0
    for p in pcts:
        if p == 0:
            run += 1
        else:
            if run >= 2:
                comebacks += 1
            run = 0

    # Specific patterns first (weekday splits), generic ones last, so a
    # weekends-only user is called a weekend warrior, not a burst executor.
    if active_days / n < 0.2:
        kind, evidence = "GHOST MODE", f"Active on {active_days} of the last {n} days."
    elif weekend and weekday and abs(avg_weekend - avg_weekday) > 20:
        kind, evidence = "WEEKEND WARRIOR", f"Weekends {round(avg_weekend)}% vs weekdays {round(avg_weekday)}%."
    elif early and rest and avg_early > avg_rest + 25:
        kind, evidence = "EARLY QUITTER", f"Mon-Tue {round(avg_early)}% vs rest of week {round(avg_rest)}%."
    elif zero_days / n > 0.5 and high_days > 0:
        kind, evidence = "BURST EXECUTOR", f"{high_days} days above 70%, but {zero_days} days at zero."
    elif zero_days / n >= 0.25 and perfect_days / n >= 0.25 and (perfect_days + zero_days) / n > 0.6:
        # Needs real swings both ways: someone who is simply at 100% most
        # days (or tracks a single habit) is consistent, not all-or-nothing.
        kind, evidence = "ALL OR NOTHING", f"{perfect_days} perfect days and {zero_days} zero days out of {n}."
    elif easy and hard and avg_easy > 60 and avg_hard < 30:
        kind, evidence = "SELECTIVE EXECUTOR", f"Easy habits {round(avg_easy)}%, hard habits {round(avg_hard)}%."
    elif first_half > second_half + 10:
        kind, evidence = "DECLINING PERFORMER", f"Average score fell from {round(first_half)} to {round(second_half)}."
    elif second_half > first_half + 10:
        kind, evidence = "SLOW STARTER", f"Average score rose from {round(first_half)} to {round(second_half)}."
    elif comebacks >= 3:
        kind, evidence = "COMEBACK KID", f"Came back after {comebacks} multi-day breaks."
    else:
        kind, evidence = "CONSISTENT BUILDER", f"Active on {active_days} of {n} days, averaging {avg_pct}%."

    return {"type": kind, "tagline": PERSONALITY_TAGLINES[kind], "evidence": evidence}


def compute_cipher_metrics(habits: list[dict], logs: list[dict], today: date, created_at: Optional[str]) -> dict:
    active = [h for h in habits if not h["archived"]]
    today_str = today.isoformat()
    reg_date = calculations.tracking_start_date(created_at, logs, today)
    days_tracked = (today - reg_date).days + 1
    is_new_user = days_tracked <= NEW_USER_DAYS

    # --- Day-level history ------------------------------------------------
    history_window = _window(today, 60, reg_date)
    day_rows = [
        {
            "date": d,
            "score": round(calculations.calculate_weighted_score(habits, logs, d.isoformat())),
            "pct": round(calculations.calculate_daily_completion(habits, logs, d.isoformat())),
        }
        for d in history_window
    ]
    by_date = {r["date"]: r for r in day_rows}

    w7 = _window(today, 7, reg_date)
    w30 = _window(today, 30, reg_date)

    def avg(field: str, window: list[date]) -> float:
        return sum(by_date[d][field] for d in window) / len(window)

    di = calculations.calculate_discipline_index(habits, logs, today_str)
    di_week_ago = calculations.calculate_discipline_index(habits, logs, (today - timedelta(days=7)).isoformat())
    baseline = round(avg("score", w30))
    completion7 = round(avg("pct", w7))
    completion30 = round(avg("pct", w30))
    active7 = sum(1 for d in w7 if by_date[d]["pct"] > 0)
    active30 = sum(1 for d in w30 if by_date[d]["pct"] > 0)
    usual_active_per_week = active30 / len(w30) * len(w7)

    # --- Per-habit stats --------------------------------------------------
    total_weight = sum(calculations.DIFFICULTY_MULTIPLIERS.get(h["difficulty"], 1.0) for h in active) or 1.0
    past_six_days = [today - timedelta(days=i) for i in range(1, 7)]

    habit_stats = []
    for h in active:
        completed = {l["date"] for l in logs if l["habit_id"] == h["id"] and l["status"] == "completed"}
        rate7 = round(sum(1 for d in w7 if d.isoformat() in completed) / len(w7) * 100)
        rate30 = round(sum(1 for d in w30 if d.isoformat() in completed) / len(w30) * 100)
        # One completed day of this habit is worth (its share of the day's
        # weight) x 100 / 7 Discipline Index points, since DI averages 7 days.
        point_value = calculations.DIFFICULTY_MULTIPLIERS.get(h["difficulty"], 1.0) / total_weight * 100 / 7
        missed_past = sum(1 for d in past_six_days if d.isoformat() not in completed)
        done_today = today_str in completed
        habit_stats.append(
            {
                "status": "on track" if rate7 >= 70 else "building" if rate7 >= 40 else "slipping",
                "done7": sum(1 for d in w7 if d.isoformat() in completed),
                "pointValue": point_value,
                "id": h["id"],
                "name": h["name"],
                "difficulty": h["difficulty"],
                "rate7": rate7,
                "rate30": rate30,
                "trend": _trend(rate7 - rate30, threshold=10),
                "streak": calculations.get_streak(h["id"], logs, today_str),
                "bestStreak": _longest_streak(completed),
                "doneToday": done_today,
                "pointsLost7": round(point_value * missed_past, 1),
                "impactToday": 0 if done_today else round(point_value, 1),
            }
        )

    working = [h for h in sorted(habit_stats, key=lambda h: (-h["rate7"], -h["streak"])) if h["rate7"] >= 50][:2]
    working_ids = {h["id"] for h in working}
    holding_back = [
        h
        for h in sorted(habit_stats, key=lambda h: (-h["pointsLost7"], h["rate7"]))
        if h["pointsLost7"] > 0 and h["id"] not in working_ids
    ][:2]

    plan = [
        {"habitId": h["id"], "name": h["name"], "impact": h["impactToday"]}
        for h in sorted(habit_stats, key=lambda h: (-h["impactToday"], -h["pointsLost7"]))
        if not h["doneToday"]
    ][:3]
    max_today = min(100, round(di + sum(h["impactToday"] for h in habit_stats)))

    # --- Weekday pattern (last 8 weeks, today excluded: it isn't over) ----
    pattern_days = [r for r in day_rows if r["date"] < today and r["date"] >= today - timedelta(days=56)]
    weekdays = []
    for i, name in enumerate(WEEKDAY_NAMES):
        samples = [r["pct"] for r in pattern_days if r["date"].weekday() == i]
        weekdays.append({"day": name, "pct": round(sum(samples) / len(samples)) if samples else None, "samples": len(samples)})
    rated = [w for w in weekdays if w["samples"] >= 2]
    best_weekday = worst_weekday = None
    if days_tracked >= PERSONALITY_MIN_DAYS and len(rated) >= 2:
        best = max(rated, key=lambda w: w["pct"])
        worst = min(rated, key=lambda w: w["pct"])
        if best["pct"] != worst["pct"]:
            best_weekday, worst_weekday = best["day"], worst["day"]

    # --- Last 7 days of daily scores (today is still in progress) ---------
    daily7 = [
        {
            "date": (today - timedelta(days=i)).isoformat(),
            "day": WEEKDAY_NAMES[(today - timedelta(days=i)).weekday()],
            "score": round(calculations.calculate_weighted_score(habits, logs, (today - timedelta(days=i)).isoformat())),
            "isToday": i == 0,
        }
        for i in range(6, -1, -1)
    ]

    # --- Streaks that end tonight if the habit is skipped -----------------
    at_risk = [
        {"name": h["name"], "streak": h["streak"]}
        for h in sorted(habit_stats, key=lambda h: -h["streak"])
        if h["streak"] >= 2 and not h["doneToday"]
    ][:3]

    # --- This week's focus: the habit whose fix moves DI most -------------
    focus = None
    candidates = sorted(
        (h for h in habit_stats if h["done7"] < len(w7)),
        key=lambda h: (-h["pointValue"] * (min(7, max(h["done7"] + 2, 4)) - h["done7"]), h["rate7"]),
    )
    if candidates and len(w7) >= 3:
        h = candidates[0]
        target = min(7, max(h["done7"] + 2, 4))
        projected = min(100, round(di + h["pointValue"] * (target - h["done7"])))
        focus = {"name": h["name"], "current": h["done7"], "target": target, "projectedDi": projected}

    # --- Headline metrics, each against the user's own baseline -----------
    top_streak = max(habit_stats, key=lambda h: h["streak"], default=None)
    best_ever = max((h["bestStreak"] for h in habit_stats), default=0)
    momentum = di - di_week_ago
    metrics = [
        {
            "key": "completion",
            "label": "Completion",
            "value": f"{completion7}%",
            "caption": "last 7 days",
            "baseline": f"{completion30}% 30-day avg",
            "trend": _trend(completion7 - completion30, threshold=5),
        },
        {
            "key": "consistency",
            "label": "Active days",
            "value": f"{active7}/{len(w7)}",
            "caption": "last 7 days",
            "baseline": f"{usual_active_per_week:.1f} usual",
            "trend": _trend(active7 - usual_active_per_week, threshold=1),
        },
        {
            "key": "momentum",
            "label": "Momentum",
            "value": _signed(momentum),
            "caption": "DI vs 7 days ago",
            "baseline": f"DI was {di_week_ago}",
            "trend": _trend(momentum, threshold=3),
        },
        {
            "key": "streak",
            "label": "Top streak",
            "value": f"{top_streak['streak'] if top_streak else 0}d",
            "caption": top_streak["name"] if top_streak and top_streak["streak"] > 0 else "no active streak",
            "baseline": f"best ever {best_ever}d",
            "trend": "up" if top_streak and top_streak["streak"] > 0 and top_streak["streak"] >= best_ever else "flat",
        },
    ]

    return {
        "daysTracked": days_tracked,
        "isNewUser": is_new_user,
        "status": _status_for(di, is_new_user),
        "score": {
            "value": di,
            "baseline": baseline,
            "weekAgo": di_week_ago,
            "momentum": momentum,
            "maxToday": max_today,
        },
        "metrics": metrics,
        "habits": habit_stats,
        "working": working,
        "holdingBack": holding_back,
        "plan": plan,
        "weekdays": weekdays,
        "bestWeekday": best_weekday,
        "worstWeekday": worst_weekday,
        "personality": _personality(day_rows, habit_stats, days_tracked),
        "daily7": daily7,
        "atRisk": at_risk,
        "focus": focus,
        "snapshot": {
            "di": di,
            "completion7": completion7,
            "activeDays7": active7,
            "topStreak": top_streak["streak"] if top_streak else 0,
            "doneToday": sum(1 for h in habit_stats if h["doneToday"]),
        },
    }


def changes_since(previous_snapshot: Optional[dict], snapshot: dict) -> list[dict]:
    """What moved since the user's previous analysis, for the "since last
    time" strip. Only changed values are returned."""
    if not previous_snapshot:
        return []
    labels = {
        "di": ("Discipline Index", ""),
        "completion7": ("7-day completion", "%"),
        "activeDays7": ("Active days", ""),
        "topStreak": ("Top streak", "d"),
        "doneToday": ("Done today", ""),
    }
    changes = []
    for key, (label, unit) in labels.items():
        before, after = previous_snapshot.get(key), snapshot.get(key)
        if isinstance(before, (int, float)) and isinstance(after, (int, float)) and after != before:
            delta = after - before
            changes.append({"label": label, "delta": f"{_signed(delta)}{unit}", "direction": "up" if delta > 0 else "down"})
    return changes
