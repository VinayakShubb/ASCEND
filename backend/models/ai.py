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
