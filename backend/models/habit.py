from typing import Literal, Optional

from pydantic import BaseModel

Difficulty = Literal["easy", "medium", "hard", "extreme"]
Frequency = Literal["daily", "weekly", "custom"]


class Habit(BaseModel):
    id: str
    name: str
    category: str
    difficulty: Difficulty
    frequency: Frequency
    created_at: str
    archived: bool


class HabitCreate(BaseModel):
    name: str
    category: str
    difficulty: Difficulty
    frequency: Frequency


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    frequency: Optional[Frequency] = None
    archived: Optional[bool] = None
