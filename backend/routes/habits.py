from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

import database
from deps import get_current_user
from models.habit import Habit, HabitCreate, HabitUpdate
from models.log import ToggleRequest, ToggleResponse
from services.user_data import get_habits, is_valid_habit_name

router = APIRouter(prefix="/habits", tags=["habits"])


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
        .insert({**body.model_dump(), "name": name, "user_id": current_user["id"]})
        .execute()
    )
    return result.data[0] if result.data else None


@router.patch("/{habit_id}", response_model=Habit)
def update_habit(habit_id: str, body: HabitUpdate, current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
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
def toggle_habit_completion(habit_id: str, body: ToggleRequest, current_user: dict = Depends(get_current_user)):
    """Flips a single day's completion for one habit: delete the log if it
    exists, otherwise create a "completed" log. Same find-then-flip logic as
    toggleHabitCompletion() in DataContext.tsx; the optimistic UI update that
    used to wrap this stays in the frontend since it's a rendering concern.
    """
    user_id = current_user["id"]
    existing = (
        database.db_client.table("habit_logs")
        .select("*")
        .eq("habit_id", habit_id)
        .eq("date", body.date)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if existing.data:
        database.db_client.table("habit_logs").delete().eq("id", existing.data[0]["id"]).execute()
        return ToggleResponse(action="uncompleted", log=None)

    result = (
        database.db_client.table("habit_logs")
        .insert({"habit_id": habit_id, "date": body.date, "status": "completed", "user_id": user_id})
        .execute()
    )
    return ToggleResponse(action="completed", log=result.data[0] if result.data else None)
