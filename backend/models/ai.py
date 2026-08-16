from typing import Dict, List, Literal, Optional

from pydantic import BaseModel

Status = Literal["elite", "solid", "slipping", "critical"]


class BriefRequest(BaseModel):
    # Frontend's localStorage quote history, so the prompt can tell the model
    # which quotes not to repeat. Same-day caching lives entirely client-side
    # now, so there's no force_refresh flag here -- the frontend just doesn't
    # call this endpoint when its cached brief is still fresh.
    recent_quotes: List[str] = []


class BriefOutput(BaseModel):
    status: Status
    quote: str
    motivation: str


class CoachOutput(BaseModel):
    status: Status
    headline: str
    insight: str
    action: str


class HallOfFame(BaseModel):
    bestProtocol: str
    bestProtocolComment: str
    bestDayComment: str


class HallOfShame(BaseModel):
    worstProtocol: str
    worstProtocolComment: str
    worstStreakComment: str


class LowlightsComments(BaseModel):
    longestDeadStreak: str
    worstDay: str
    mostBrokenHabit: str
    biggestDrop: str


class Order(BaseModel):
    rank: int
    action: str
    estimatedImpact: str


class CipherAnalysisOutput(BaseModel):
    status: Status
    operatorVerdict: str
    timelineComments: Dict[str, str]
    executionType: str
    personalityInsight: str
    hallOfFame: HallOfFame
    hallOfShame: HallOfShame
    lowlightsComments: LowlightsComments
    ceilingInsight: str
    biggestMistakeName: str
    biggestMistake: str
    biggestWinName: str
    biggestWin: str
    orders: List[Order]
    analyzedAt: Optional[str] = None
