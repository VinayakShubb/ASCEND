from typing import Literal, Optional

from pydantic import BaseModel, Field

Difficulty = Literal["easy", "medium", "hard", "extreme"]
Frequency = Literal["daily", "weekly", "custom"]

HABIT_NAME_MAX_LENGTH = 60
CATEGORY_MAX_LENGTH = 40


class Habit(BaseModel):
    id: str
    name: str
    category: str
    difficulty: Difficulty
    frequency: Frequency
    created_at: str
    archived: bool


class HabitCreate(BaseModel):
    name: str = Field(max_length=HABIT_NAME_MAX_LENGTH)
    category: str = Field(max_length=CATEGORY_MAX_LENGTH)
    difficulty: Difficulty
    frequency: Frequency


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=HABIT_NAME_MAX_LENGTH)
    category: Optional[str] = Field(default=None, max_length=CATEGORY_MAX_LENGTH)
    difficulty: Optional[Difficulty] = None
    frequency: Optional[Frequency] = None
    archived: Optional[bool] = None


class HabitReminder(BaseModel):
    habit_id: str
    name: str
    # Learned check-off time as "HH:MM" (24h) in the user's timezone, or None
    # when there isn't enough history yet to suggest one.
    suggested_time: Optional[str] = None
    samples: int
    done_today: bool
