"""Shared fetch + validation helpers used by the habits, stats, and ai routes."""

import database

INVALID_NAMES = {"nan", "non", "null", "undefined"}


def is_valid_habit_name(name: str | None) -> bool:
    """Filters out corrupted habit rows (e.g. "NoN", empty names) that ended
    up in the database from an earlier bug. Same rule the frontend used to
    apply in DataContext.tsx.
    """
    cleaned = (name or "").strip().lower()
    return len(cleaned) > 0 and cleaned not in INVALID_NAMES


def get_habits(user_id: str) -> list[dict]:
    result = (
        database.db_client.table("habits")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [h for h in (result.data or []) if is_valid_habit_name(h.get("name"))]


def get_logs(user_id: str) -> list[dict]:
    result = database.db_client.table("habit_logs").select("*").eq("user_id", user_id).execute()
    return result.data or []
