from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from deps import derive_username, get_current_user
from models.ai import BriefOutput, BriefRequest, CipherAnalysisOutput, CoachOutput
from services import ai_brief, ai_coach
from services.user_data import get_habits, get_logs

router = APIRouter(prefix="/ai", tags=["ai"])


# POST (not GET) because it needs to send a recent_quotes list in the body --
# it doesn't change any server state.
@router.post("/brief", response_model=Optional[BriefOutput])
def get_brief(body: BriefRequest, current_user: dict = Depends(get_current_user)):
    username = derive_username(current_user["user_metadata"], current_user["email"])
    habits = get_habits(current_user["id"])
    logs = get_logs(current_user["id"])

    result = ai_brief.get_daily_brief(
        username=username,
        habits=habits,
        logs=logs,
        created_at=current_user["created_at"],
        recent_quotes=body.recent_quotes,
    )
    if result is None:
        raise HTTPException(status_code=502, detail="AI brief unavailable")
    return result


@router.get("/coach", response_model=Optional[CoachOutput])
def get_coach(current_user: dict = Depends(get_current_user)):
    username = derive_username(current_user["user_metadata"], current_user["email"])
    habits = get_habits(current_user["id"])
    logs = get_logs(current_user["id"])

    result = ai_coach.get_coach_insight(username, habits, logs)
    return result  # None is a valid response: no active habits, or Groq unavailable


@router.get("/cipher", response_model=Optional[CipherAnalysisOutput])
def get_cipher(is_new_user: bool = Query(False), current_user: dict = Depends(get_current_user)):
    username = derive_username(current_user["user_metadata"], current_user["email"])
    habits = get_habits(current_user["id"])
    logs = get_logs(current_user["id"])

    result = ai_coach.get_cipher_analysis(
        user_id=username,
        user_created_at=current_user["created_at"],
        habits=habits,
        logs=logs,
        is_new_user=is_new_user,
    )
    return result
