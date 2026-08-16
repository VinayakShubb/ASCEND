from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from deps import get_current_user
from services import calculations
from services.user_data import get_habits, get_logs

router = APIRouter(prefix="/stats", tags=["stats"])

MAX_RANGE_DAYS = 366


@router.get("/range")
def stats_range(
    start: str = Query(..., description="YYYY-MM-DD, inclusive"),
    end: str = Query(..., description="YYYY-MM-DD, inclusive"),
    current_user: dict = Depends(get_current_user),
):
    """Per-day completion % and weighted score for every day in [start, end].
    This exists so the calendar grid and analytics charts can render from one
    request instead of the frontend recomputing calculations.ts client-side
    or calling the API once per day.
    """
    start_date = date.fromisoformat(start)
    end_date = date.fromisoformat(end)
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end must not be before start")
    if (end_date - start_date).days > MAX_RANGE_DAYS:
        raise HTTPException(status_code=400, detail=f"range cannot exceed {MAX_RANGE_DAYS} days")

    habits = get_habits(current_user["id"])
    logs = get_logs(current_user["id"])

    days = []
    current = start_date
    while current <= end_date:
        d = current.isoformat()
        days.append(
            {
                "date": d,
                "completion_pct": round(calculations.calculate_daily_completion(habits, logs, d)),
                "weighted_score": round(calculations.calculate_weighted_score(habits, logs, d)),
            }
        )
        current += timedelta(days=1)
    return days


@router.get("/streaks")
def stats_streaks(current_user: dict = Depends(get_current_user)):
    """Current streak per active habit, keyed by habit id."""
    habits = get_habits(current_user["id"])
    logs = get_logs(current_user["id"])
    active_habits = [h for h in habits if not h["archived"]]
    return {h["id"]: calculations.get_streak(h["id"], logs) for h in active_habits}


@router.get("/summary")
def stats_summary(
    end: str = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    current_user: dict = Depends(get_current_user),
):
    """Headline numbers (7-day Discipline Index + that day's completion/score)
    as of a given date, defaulting to today. Accepting an explicit `end` lets
    the frontend ask for e.g. "last week's" Discipline Index using the exact
    same server-side math instead of re-deriving it from /stats/range, which
    would round each day first and risk a rounding-of-rounded-values drift.
    """
    habits = get_habits(current_user["id"])
    logs = get_logs(current_user["id"])
    as_of = end or date.today().isoformat()
    return {
        "discipline_index": calculations.calculate_discipline_index(habits, logs, as_of),
        "today_completion_pct": round(calculations.calculate_daily_completion(habits, logs, as_of)),
        "today_weighted_score": round(calculations.calculate_weighted_score(habits, logs, as_of)),
    }


@router.get("/ceiling")
def stats_ceiling(current_user: dict = Depends(get_current_user)):
    """Current Discipline Index vs. the DI you'd have if every active habit
    got completed today. Powers the CIPHER "index ceiling" section: it's a
    hypothetical, not a stored value, so it needs its own simulation rather
    than just reading /stats/summary.
    """
    habits = get_habits(current_user["id"])
    logs = get_logs(current_user["id"])
    today = date.today().isoformat()

    current = calculations.calculate_discipline_index(habits, logs)

    active_habits = [h for h in habits if not h["archived"]]
    already_done_today = {l["habit_id"] for l in logs if l["date"] == today and l["status"] == "completed"}
    simulated_logs = list(logs) + [
        {"habit_id": h["id"], "date": today, "status": "completed"}
        for h in active_habits
        if h["id"] not in already_done_today
    ]
    max_today = min(100, calculations.calculate_discipline_index(habits, simulated_logs))

    return {"current": current, "max_today": max_today}
