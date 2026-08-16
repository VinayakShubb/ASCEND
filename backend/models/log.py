from typing import Literal, Optional

from pydantic import BaseModel


class HabitLog(BaseModel):
    id: str
    habit_id: str
    date: str
    status: Literal["completed", "missed", "skipped"]
    timestamp: str


class ToggleRequest(BaseModel):
    date: str


class ToggleResponse(BaseModel):
    action: Literal["completed", "uncompleted"]
    log: Optional[HabitLog] = None
