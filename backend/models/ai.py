from typing import Annotated, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Status = Literal["elite", "solid", "slipping", "critical"]


class BriefRequest(BaseModel):
    # Optional quote history from the frontend's old localStorage cache. The
    # server now keeps its own history (ai_generations), and merges these in
    # so quotes from before the switch still aren't repeated.
    recent_quotes: List[Annotated[str, Field(max_length=300)]] = Field(default=[], max_length=30)


class BriefOutput(BaseModel):
    status: Status
    quote: str
    motivation: str


class CoachOutput(BaseModel):
    status: Status
    headline: str
    insight: str
    action: str


# --- CIPHER v2 (WHOOP-style analysis; numbers computed in Python) ---------

Trend = Literal["up", "down", "flat"]


class CipherScore(BaseModel):
    value: int
    baseline: int
    weekAgo: int
    momentum: int
    maxToday: int


class CipherMetric(BaseModel):
    key: str
    label: str
    value: str
    caption: str
    baseline: str
    trend: Trend


class CipherHabit(BaseModel):
    name: str
    rate7: int
    rate30: int
    trend: Trend
    streak: int
    pointsLost7: float
    note: str


class CipherPersonality(BaseModel):
    type: str
    tagline: str
    evidence: str
    insight: str


class CipherWeekday(BaseModel):
    day: str
    pct: Optional[int] = None
    samples: int


class CipherPlanItem(BaseModel):
    habitId: str
    name: str
    impact: float
    action: str


class CipherChange(BaseModel):
    label: str
    delta: str
    direction: Literal["up", "down"]


class CipherAnalysisV2(BaseModel):
    version: Literal[2]
    analyzedAt: str
    narrative: bool
    status: Status
    isNewUser: bool
    daysTracked: int
    score: CipherScore
    metrics: List[CipherMetric]
    verdict: str
    personality: CipherPersonality
    working: List[CipherHabit]
    holdingBack: List[CipherHabit]
    weekdays: List[CipherWeekday]
    bestWeekday: Optional[str] = None
    worstWeekday: Optional[str] = None
    patternNote: str
    plan: List[CipherPlanItem]
    changes: List[CipherChange]
    snapshot: Dict[str, float]
