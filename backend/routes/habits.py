from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError

import database
from deps import get_current_user, get_user_today
from models.habit import Habit, HabitCreate, HabitUpdate
from models.log import ToggleRequest, ToggleResponse
from services.user_data import get_habits, is_valid_habit_name

router = APIRouter(prefix="/habits", tags=["habits"])


def _require_own_habit(habit_id: str, user_id: str) -> None:
    """404 unless the habit exists and belongs to this user. The backend uses
    the service-role key, which skips Postgres row-level security, so this
    check is the only thing stopping writes against someone else's habit."""
    result = (
        database.db_client.table("habits")
        .select("id")
        .eq("id", habit_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Habit not found")


@router.get("", response_model=list[Habit])
def list_habits(current_user: dict = Depends(get_current_user)):
    return get_habits(current_user["id"])


@router.post("", response_model=Optional[Habit])
def create_habit(body: HabitCreate, current_user: dict = Depends(get_current_user)):
    name = body.name.strip()
    if not is_valid_habit_name(name):
        # Mirrors addHabit() in DataContext.tsx, which silently no-ops
        # instead of raising when the name is empty/junk.
        return None
    result = (
        database.db_client.table("habits")
        .insert({**body.model_dump(), "name": name, "category": body.category.strip(), "user_id": current_user["id"]})
        .execute()
    )
    return result.data[0] if result.data else None


@router.patch("/{habit_id}", response_model=Habit)
def update_habit(habit_id: str, body: HabitUpdate, current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "name" in updates:
        updates["name"] = updates["name"].strip()
        if not is_valid_habit_name(updates["name"]):
            raise HTTPException(status_code=422, detail="Habit name cannot be empty")
    if "category" in updates:
        updates["category"] = updates["category"].strip()
    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")

    result = (
        database.db_client.table("habits")
        .update(updates)
        .eq("id", habit_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Habit not found")
    return result.data[0]


@router.delete("/{habit_id}")
def delete_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    database.db_client.table("habits").delete().eq("id", habit_id).eq("user_id", current_user["id"]).execute()
    return {"ok": True}


@router.post("/{habit_id}/toggle", response_model=ToggleResponse)
def toggle_habit_completion(
    habit_id: str,
    body: ToggleRequest,
    current_user: dict = Depends(get_current_user),
    today: date = Depends(get_user_today),
):
    """Flips a single day's completion for one habit: delete the log if it
    exists, otherwise create a "completed" log. Same find-then-flip logic as
    toggleHabitCompletion() in DataContext.tsx; the optimistic UI update that
    used to wrap this stays in the frontend since it's a rendering concern.
    """
    user_id = current_user["id"]

    # A habit can only be checked off on the day itself. Backfilling a past day
    # would let anyone inflate their Discipline Index after the fact, so past
    # days are locked; one day of upper slack covers clocks/timezones that are
    # slightly ahead.
    log_date = date.fromisoformat(body.date)
    if log_date > today + timedelta(days=1):
        raise HTTPException(status_code=422, detail="Cannot log a habit for a future date")
    if log_date < today:
        raise HTTPException(status_code=422, detail="You can only check a habit off on the day itself, not a past day")

    _require_own_habit(habit_id, user_id)

    existing = (
        database.db_client.table("habit_logs")
        .select("*")
        .eq("habit_id", habit_id)
        .eq("date", body.date)
        .eq("user_id", user_id)
        .execute()
    )
    if existing.data:
        # Deletes every matching row, so any duplicates created before the
        # UNIQUE(habit_id, date) constraint existed are cleaned up too.
        database.db_client.table("habit_logs").delete().eq("habit_id", habit_id).eq("date", body.date).eq(
            "user_id", user_id
        ).execute()
        return ToggleResponse(action="uncompleted", log=None)

    try:
        result = (
            database.db_client.table("habit_logs")
            .insert({"habit_id": habit_id, "date": body.date, "status": "completed", "user_id": user_id})
            .execute()
        )
    except APIError as e:
        if getattr(e, "code", None) != "23505":
            raise
        # A double tap raced us and the other request already inserted the
        # log. The habit is completed either way, so report that.
        concurrent = (
            database.db_client.table("habit_logs")
            .select("*")
            .eq("habit_id", habit_id)
            .eq("date", body.date)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return ToggleResponse(action="completed", log=concurrent.data[0] if concurrent.data else None)

    return ToggleResponse(action="completed", log=result.data[0] if result.data else None)
