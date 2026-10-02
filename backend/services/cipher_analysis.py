"""CIPHER: turns the computed metrics into the analysis the page shows.

Python decides every number (services/cipher_metrics.py). The model only
writes commentary around them: a headline and verdict, strengths and risks,
this week's focus, a note per habit, a line about the weekday pattern, a
personality insight and today's actions. If Groq fails, `build_analysis`
still produces a complete page with plain default sentences
(narrative=False).
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from services import groq_client

logger = logging.getLogger(__name__)

VERSION = 4
MAX_HABITS_IN_PROMPT = 8


def _clean(text: object, max_words: int) -> str:
    """Tidy sentence(s) from model output: no line breaks, wrapping quotes,
    em-dashes or runaway length."""
    if not isinstance(text, str):
        return ""
    cleaned = re.sub(r"\s+", " ", text).strip().strip("\"'")
    cleaned = cleaned.replace(" — ", ", ").replace("—", ", ").replace(" – ", ", ").replace("–", "-")
    words = cleaned.split()
    if len(words) > max_words:
        cleaned = " ".join(words[:max_words]).rstrip(",;:") + "."
    if cleaned and cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def _habit_line(h: dict) -> str:
    return (
        f"- {h['name']} ({h['difficulty']}): done {h['done7']} of the last 7 days ({h['rate7']}%), "
        f"{h['rate30']}% over 30 days, {h['streak']}-day streak, {'done' if h['doneToday'] else 'not done'} today, "
        f"missed days this week cost {h['pointsLost7']} DI points"
    )


def build_prompt(username: str, m: dict) -> str:
    score = m["score"]
    habits = m["habits"][:MAX_HABITS_IN_PROMPT]
    all_habits = "\n".join(_habit_line(h) for h in habits) or "- none"
    working = ", ".join(h["name"] for h in m["working"]) or "none yet"
    holding = ", ".join(h["name"] for h in m["holdingBack"]) or "none"
    plan = "\n".join(f"- {p['name']}: completing it today adds +{p['impact']} DI" for p in m["plan"]) or "- everything is done today"
    at_risk = ", ".join(f"{r['name']} ({r['streak']}-day streak)" for r in m["atRisk"]) or "none"
    focus = m["focus"]
    focus_text = (
        f"{focus['name']}: done {focus['current']} of the last 7 days; target {focus['target']} of 7 next week, "
        f"which would lift DI to about {focus['projectedDi']}"
        if focus
        else "none"
    )
    daily = ", ".join(f"{d['day']} {d['score']}" for d in m["daily7"])
    weekday = (
        f"Best weekday: {m['bestWeekday']}. Worst weekday: {m['worstWeekday']}."
        if m["bestWeekday"]
        else "Not enough history for a weekday pattern."
    )
    tone = (
        "This user is in their first 3 days. Be welcoming and instructional. Never criticise; teach how the system works."
        if m["isNewUser"]
        else (
            "Be a direct, honest coach who genuinely wants them to win. Praise real wins specifically. "
            "Name real problems plainly. No insults, no drama, no generic motivation."
        )
    )
    habit_notes = ", ".join(f'"{h["name"]}": "one sentence of interpretation or advice for this habit, no numbers"' for h in habits)
    plan_actions = ", ".join(f'"{p["name"]}": "a concrete action for today, max 14 words"' for p in m["plan"])

    return f"""You are CIPHER, the performance analyst inside ASCEND, a habit tracker.
Every number below is already calculated and correct. Never invent, change or round a number; only use numbers shown here.

USER: {username}
Days tracked: {m['daysTracked']}
Discipline Index (DI, 7-day average, 0-100): {score['value']}
30-day average daily score: {score['baseline']}
DI 7 days ago: {score['weekAgo']} (change {score['momentum']:+d})
Highest DI possible today: {score['maxToday']}
Daily scores, last 7 days (today still in progress): {daily}
Execution type: {m['personality']['type'].title()} ({m['personality']['evidence']} "Active days" counts days with at least one habit done; it is NOT a streak.)

HABITS:
{all_habits}

Strongest: {working}. Weakest: {holding}.
Streaks that end tonight if skipped: {at_risk}
This week's focus: {focus_text}
WEEKDAY PATTERN: {weekday}

TODAY'S BEST MOVES:
{plan}

TONE: {tone}
Address {username} as "you". Plain everyday words, short sentences. Do not use the words "protocol" or "operator". No em-dashes.
The page already shows every number next to each section, so habit notes and actions must NOT list numbers. Give meaning, cause or advice instead.
Only mention a streak if it appears in the HABITS list above, with that exact length.
Habit names are just labels: never read numbers or durations inside a name (like "2h" in "Deep work 2h") as data.

Respond with ONLY this JSON:
{{
  "headline": "max 7 words summing up their state, like a newspaper headline",
  "verdict": "2 sentences starting with '{username},'. The single most important thing about their current state and why.",
  "strengths": "2 sentences on what is genuinely going well, with specific habits and numbers.",
  "risks": "2 sentences on the biggest risk to their score right now, with specific habits and numbers.",
  "weeklyFocus": "2 sentences explaining this week's focus target and what hitting it would do for their DI.",
  "personalityInsight": "2 sentences on what this execution type means for them and one way to use it this week. Write the type in normal case.",
  "habitNotes": {{ {habit_notes} }},
  "patternNote": "one sentence about the weekday pattern, or an empty string if there is none",
  "planActions": {{ {plan_actions} }}
}}"""


def _default_headline(m: dict) -> str:
    if m["isNewUser"]:
        return "Building your baseline"
    momentum = m["score"]["momentum"]
    if momentum >= 5:
        return "Climbing this week"
    if momentum <= -5:
        return "Losing ground this week"
    return "Holding steady"


def _default_verdict(username: str, m: dict) -> str:
    score = m["score"]
    if m["isNewUser"]:
        return f"{username}, you are in your first days. Check off what you complete and your Discipline Index will build up over the week."
    relation = "above" if score["value"] > score["baseline"] else "below" if score["value"] < score["baseline"] else "level with"
    return f"{username}, your Discipline Index is {score['value']}, {relation} your 30-day average of {score['baseline']}."


def _public_habit(h: dict) -> dict:
    return {
        "name": h["name"],
        "status": h["status"],
        "done7": h["done7"],
        "rate7": h["rate7"],
        "rate30": h["rate30"],
        "trend": h["trend"],
        "streak": h["streak"],
        "pointsLost7": h["pointsLost7"],
        "lossExplain": h["lossExplain"],
    }


def build_analysis(username: str, m: dict, ai: Optional[dict]) -> dict:
    """The full analysis. `ai` is the parsed model JSON, or None."""
    ai = ai or {}
    notes = ai.get("habitNotes") if isinstance(ai.get("habitNotes"), dict) else {}
    actions = ai.get("planActions") if isinstance(ai.get("planActions"), dict) else {}

    def default_note(h: dict) -> str:
        if h["rate7"] >= 70:
            return f"{h['rate7']}% this week" + (f" with a {h['streak']}-day streak." if h["streak"] > 1 else ".")
        if h["pointsLost7"] > 0:
            return f"Done {h['done7']} of the last 7 days. Missed days cost {h['pointsLost7']} DI points."
        return f"{h['rate7']}% this week against {h['rate30']}% over 30 days."

    def with_note(h: dict) -> dict:
        return {**_public_habit(h), "note": _clean(notes.get(h["name"]), 30) or default_note(h)}

    focus = m["focus"]
    default_focus = (
        f"Get {focus['name']} to {focus['target']} of 7 days this week. "
        f"That alone lifts your Discipline Index to about {focus['projectedDi']}."
        if focus
        else ""
    )
    strongest = m["working"][0]["name"] if m["working"] else None
    weakest = m["holdingBack"][0] if m["holdingBack"] else None

    return {
        "version": VERSION,
        "analyzedAt": datetime.now(timezone.utc).isoformat(),
        "narrative": bool(ai),
        "status": m["status"],
        "isNewUser": m["isNewUser"],
        "daysTracked": m["daysTracked"],
        "score": m["score"],
        "metrics": m["metrics"],
        "daily7": m["daily7"],
        "headline": _clean(ai.get("headline"), 8).rstrip(".") or _default_headline(m),
        "verdict": _clean(ai.get("verdict"), 50) or _default_verdict(username, m),
        "strengths": _clean(ai.get("strengths"), 45)
        or (
            f"{strongest} is your most reliable habit right now."
            if strongest
            else "Your strengths show up once a habit reaches 50% in a week."
        ),
        "risks": _clean(ai.get("risks"), 45)
        or (
            f"{weakest['name']} cost you {weakest['pointsLost7']} DI points this week."
            if weakest
            else "No habit cost you points this week."
        ),
        "weeklyFocus": (_clean(ai.get("weeklyFocus"), 45) or default_focus) if focus else "",
        "focus": focus,
        "atRisk": m["atRisk"],
        "personality": {
            **m["personality"],
            "insight": _clean(ai.get("personalityInsight"), 45) if m["personality"]["type"] != "CALIBRATING" else "",
        },
        "working": [with_note(h) for h in m["working"]],
        "holdingBack": [with_note(h) for h in m["holdingBack"]],
        "habits": [with_note(h) for h in m["habits"]],
        "weekdays": m["weekdays"],
        "bestWeekday": m["bestWeekday"],
        "worstWeekday": m["worstWeekday"],
        "patternNote": _clean(ai.get("patternNote"), 30) if m["bestWeekday"] else "",
        "rhythmExplain": m["rhythmExplain"],
        "plan": [
            {**p, "action": _clean(actions.get(p["name"]), 16) or f"Complete {p['name']} today."}
            for p in m["plan"]
        ],
        "changes": [],
        "snapshot": m["snapshot"],
    }


def generate_narrative(username: str, m: dict) -> Optional[dict]:
    """Asks Groq for the commentary. None if Groq is unavailable or the reply
    isn't usable JSON."""
    raw = groq_client.call_groq(build_prompt(username, m), temperature=0.6, max_tokens=1100, json_mode=True)
    if raw is None:
        return None
    try:
        parsed = json.loads(re.sub(r"```json|```", "", raw, flags=re.I).strip())
    except json.JSONDecodeError:
        logger.warning("CIPHER narrative was not valid JSON")
        return None
    if not isinstance(parsed, dict) or not isinstance(parsed.get("verdict"), str):
        logger.warning("CIPHER narrative missing verdict")
        return None
    return parsed
