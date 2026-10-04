import math
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Header, HTTPException
from postgrest.exceptions import APIError

import database
from deps import get_current_user, get_user_today
from models.habit import Habit, HabitCreate, HabitReminder, HabitUpdate
from models.log import ToggleRequest, ToggleResponse
from services.user_data import get_habits, is_valid_habit_name

router = APIRouter(prefix="/habits", tags=["habits"])

# How much history to learn reminder times from, and the fewest check-offs
# before we trust a suggested time rather than returning none.
_REMINDER_LOOKBACK_DAYS = 45
_REMINDER_MIN_SAMPLES = 4


def _circular_mean_minute(minutes: list[int]) -> int:
    """Average times of day as angles so they wrap correctly at midnight
    (23:50 and 00:10 average to midnight, not to noon)."""
    xs = sum(math.cos(2 * math.pi * m / 1440) for m in minutes)
    ys = sum(math.sin(2 * math.pi * m / 1440) for m in minutes)
    angle = math.atan2(ys, xs)
    return int(round(angle / (2 * math.pi) * 1440)) % 1440


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


@router.get("/reminders", response_model=list[HabitReminder])
def get_habit_reminders(
    current_user: dict = Depends(get_current_user),
    today: date = Depends(get_user_today),
    x_timezone: Optional[str] = Header(default=None),
):
    """For each active habit: the time of day the user usually checks it off
    (learned from recent completion timestamps, in their own timezone) and
    whether it is already done today. The app uses this to schedule a reminder
    at the right time for each habit that is still open."""
    user_id = current_user["id"]
    try:
        tz = ZoneInfo(x_timezone) if x_timezone else timezone.utc
    except (ZoneInfoNotFoundError, ValueError):
        tz = timezone.utc

    habits = [h for h in get_habits(user_id) if not h.get("archived")]
    if not habits:
        return []

    since = (today - timedelta(days=_REMINDER_LOOKBACK_DAYS)).isoformat()
    today_str = today.isoformat()
    logs = (
        database.db_client.table("habit_logs")
        .select("habit_id,date,timestamp")
        .eq("user_id", user_id)
        .gte("date", since)
        .execute()
    )

    minutes_by_habit: dict[str, list[int]] = {}
    done_today: set[str] = set()
    for log in logs.data or []:
        habit_id = log.get("habit_id")
        if log.get("date") == today_str:
            done_today.add(habit_id)
        ts = log.get("timestamp")
        if not ts:
            continue
        try:
            moment = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        except ValueError:
            continue
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        local = moment.astimezone(tz)
        minutes_by_habit.setdefault(habit_id, []).append(local.hour * 60 + local.minute)

    reminders: list[HabitReminder] = []
    for habit in habits:
        habit_id = habit["id"]
        minutes = minutes_by_habit.get(habit_id, [])
        suggested = None
        if len(minutes) >= _REMINDER_MIN_SAMPLES:
            m = _circular_mean_minute(minutes)
            suggested = f"{m // 60:02d}:{m % 60:02d}"
        reminders.append(
            HabitReminder(
                habit_id=habit_id,
                name=habit["name"],
                suggested_time=suggested,
                samples=len(minutes),
                done_today=habit_id in done_today,
            )
        )
    return reminders


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
            .insert(
                {
                    "habit_id": habit_id,
                    "date": body.date,
                    "status": "completed",
                    "user_id": user_id,
                    # Captured so reminders can learn when you usually check
                    # this habit off; see GET /habits/reminders.
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
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
