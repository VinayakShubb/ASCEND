"""Creates (or resets) a demo account with 60 days of realistic history, so
CIPHER, the dashboard and the calendar can be seen with real-looking data.

Usage (from backend/, with .env pointing at the target Supabase project):
    python -m scripts.seed_demo_account

Re-running resets the demo account's habits, logs and stored AI results and
gives it a fresh password. It only ever touches the demo account.
"""

import random
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import database

DEMO_EMAIL = "demo@ascend-demo.app"
DEMO_USERNAME = "demo"
HISTORY_DAYS = 60
TIMEZONE = "Asia/Kolkata"

# name, category, difficulty, base completion chance, pattern
HABITS = [
    ("Gym", "Health", "hard", 0.80, "steady_weekend_dip"),
    ("Read 20 pages", "Mind", "easy", 0.55, "improving"),
    ("Deep work 2h", "Career", "extreme", 0.70, "declining"),
    ("Meditate 10 min", "Mind", "medium", 0.72, "steady"),
    ("Sleep by 11pm", "Health", "medium", 0.60, "weekend_crash"),
]

# What is already done "today" when the demo is seeded. Meditate is left
# open on purpose so its streak shows up as "on the line tonight".
DONE_TODAY = {"Gym", "Read 20 pages"}


def _chance(pattern: str, base: float, days_ago: int, weekday: int) -> float:
    weekend = weekday >= 5
    if pattern == "steady_weekend_dip":
        return base - (0.35 if weekend else 0)
    if pattern == "improving":
        return min(0.95, base - 0.25 + (HISTORY_DAYS - days_ago) / HISTORY_DAYS * 0.55)
    if pattern == "declining":
        return max(0.1, base - (HISTORY_DAYS - days_ago) / HISTORY_DAYS * 0.55)
    if pattern == "weekend_crash":
        return 0.15 if weekend else base + 0.2
    return base


def _find_user_id() -> str | None:
    page = 1
    while True:
        users = database.db_client.auth.admin.list_users(page=page, per_page=200)
        if not users:
            return None
        for user in users:
            if (user.email or "").lower() == DEMO_EMAIL:
                return user.id
        page += 1


def main() -> None:
    password = "Demo-" + secrets.token_urlsafe(9)
    user_id = _find_user_id()

    if user_id:
        database.db_client.auth.admin.update_user_by_id(user_id, {"password": password})
        # Habits cascade to their logs.
        database.db_client.table("habits").delete().eq("user_id", user_id).execute()
        database.db_client.table("ai_generations").delete().eq("user_id", user_id).execute()
    else:
        created = database.db_client.auth.admin.create_user(
            {
                "email": DEMO_EMAIL,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"username": DEMO_USERNAME},
            }
        )
        user_id = created.user.id
        database.db_client.table("profiles").insert(
            {"id": user_id, "username": DEMO_USERNAME, "email": DEMO_EMAIL}
        ).execute()

    today = datetime.now(ZoneInfo(TIMEZONE)).date()
    start = today - timedelta(days=HISTORY_DAYS)
    rng = random.Random(42)

    habit_rows = (
        database.db_client.table("habits")
        .insert(
            [
                {
                    "user_id": user_id,
                    "name": name,
                    "category": category,
                    "difficulty": difficulty,
                    "frequency": "daily",
                    "created_at": f"{start.isoformat()}T09:00:00+05:30",
                }
                for name, category, difficulty, _, _ in HABITS
            ]
        )
        .execute()
        .data
    )
    ids = {row["name"]: row["id"] for row in habit_rows}

    logs = []
    for days_ago in range(HISTORY_DAYS, 0, -1):
        day = today - timedelta(days=days_ago)
        for name, _, _, base, pattern in HABITS:
            # Keep the last few days fixed so streaks look deliberate.
            if days_ago <= 6 and name in ("Gym", "Meditate 10 min"):
                done = not (name == "Gym" and days_ago == 6)
            elif days_ago <= 7 and name == "Deep work 2h":
                done = days_ago in (3, 6)
            else:
                done = rng.random() < _chance(pattern, base, days_ago, day.weekday())
            if done:
                logs.append({"user_id": user_id, "habit_id": ids[name], "date": day.isoformat(), "status": "completed"})
    for name in DONE_TODAY:
        logs.append({"user_id": user_id, "habit_id": ids[name], "date": today.isoformat(), "status": "completed"})

    for i in range(0, len(logs), 200):
        database.db_client.table("habit_logs").insert(logs[i : i + 200]).execute()

    print(f"Demo account ready: {len(habit_rows)} habits, {len(logs)} completed days over {HISTORY_DAYS} days.")
    print(f"  Email:    {DEMO_EMAIL}")
    print(f"  User ID:  {DEMO_USERNAME}")
    print(f"  Password: {password}")


if __name__ == "__main__":
    main()
