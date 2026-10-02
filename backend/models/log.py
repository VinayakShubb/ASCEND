from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, field_validator


class HabitLog(BaseModel):
    id: str
    habit_id: str
    date: str
    status: Literal["completed", "missed", "skipped"]
    timestamp: str


class ToggleRequest(BaseModel):
    date: str

    @field_validator("date")
    @classmethod
    def must_be_iso_date(cls, value: str) -> str:
        try:
            return date.fromisoformat(value).isoformat()
        except ValueError:
            raise ValueError("date must be YYYY-MM-DD")


class ToggleResponse(BaseModel):
    action: Literal["completed", "uncompleted"]
    log: Optional[HabitLog] = None
