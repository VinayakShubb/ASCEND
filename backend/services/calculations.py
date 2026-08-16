"""Port of frontend/src/utils/calculations.ts.

Habits and logs are passed around as plain dicts (matching the JSON shape
Supabase returns) rather than custom classes -- there's no behavior here
that needs a class, just functions over lists of dicts.
"""

from datetime import date, timedelta
from typing import Optional

DIFFICULTY_MULTIPLIERS = {
    "easy": 1.0,
    "medium": 1.2,
    "hard": 1.5,
    "extreme": 2.0,
}


def calculate_daily_completion(habits: list[dict], logs: list[dict], date_str: str) -> float:
    """Percentage of active (non-archived) habits completed on a given day."""
    active_habits = [h for h in habits if not h["archived"]]
    if not active_habits:
        return 0

    active_habit_ids = {h["id"] for h in active_habits}
    completed_count = sum(
        1
        for l in logs
        if l["date"] == date_str and l["status"] == "completed" and l["habit_id"] in active_habit_ids
    )
    return (completed_count / len(active_habits)) * 100


def calculate_weighted_score(habits: list[dict], logs: list[dict], date_str: str) -> float:
    """Difficulty-weighted completion score (0-100) for a given day.
    Harder habits count for more of the day's total than easy ones.
    """
    active_habits = [h for h in habits if not h["archived"]]
    if not active_habits:
        return 0

    completed_habit_ids = {l["habit_id"] for l in logs if l["date"] == date_str and l["status"] == "completed"}

    potential_score = 0.0
    earned_score = 0.0
    for habit in active_habits:
        multiplier = DIFFICULTY_MULTIPLIERS.get(habit["difficulty"], 1.0)
        potential_score += multiplier
        if habit["id"] in completed_habit_ids:
            earned_score += multiplier

    if potential_score == 0:
        return 0
    return (earned_score / potential_score) * 100


def calculate_discipline_index(habits: list[dict], logs: list[dict], end_date_str: Optional[str] = None) -> int:
    """7-day rolling average of daily weighted scores, ending at end_date_str (default today)."""
    end_date = date.fromisoformat(end_date_str) if end_date_str else date.today()
    days = 7
    total_score = 0.0
    for i in range(days):
        d = (end_date - timedelta(days=i)).isoformat()
        total_score += calculate_weighted_score(habits, logs, d)
    return round(total_score / days)


def get_streak(habit_id: str, logs: list[dict], current_date_str: Optional[str] = None) -> int:
    """Current consecutive-day completion streak for one habit.
    A streak survives until end of day: if today isn't done yet but
    yesterday was, the streak is still "alive" and counts from yesterday back.
    """
    current_date = date.fromisoformat(current_date_str) if current_date_str else date.today()
    completed_dates = {l["date"] for l in logs if l["habit_id"] == habit_id and l["status"] == "completed"}

    streak = 0
    if current_date.isoformat() in completed_dates:
        streak += 1

    check_date = current_date - timedelta(days=1)

    if streak == 0:
        yesterday_str = check_date.isoformat()
        if yesterday_str not in completed_dates:
            return 0  # no streak alive

    while check_date.isoformat() in completed_dates:
        streak += 1
        check_date -= timedelta(days=1)

    return streak
