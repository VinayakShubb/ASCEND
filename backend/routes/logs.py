from fastapi import APIRouter, Depends

from deps import get_current_user
from models.log import HabitLog
from services.user_data import get_logs

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=list[HabitLog])
def list_logs(current_user: dict = Depends(get_current_user)):
    return get_logs(current_user["id"])
