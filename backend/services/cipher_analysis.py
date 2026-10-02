"""CIPHER v2: turns the computed metrics into the analysis the page shows.

Python decides every number (services/cipher_metrics.py). The model only
writes short commentary: a verdict, one note per highlighted habit, a line
about the weekday pattern, a personality insight and tonight's actions. If
Groq fails, `build_analysis` still produces a complete page with plain
default sentences (narrative=False).
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from services import groq_client

logger = logging.getLogger(__name__)

VERSION = 2


def _clean(text: object, max_words: int) -> str:
    """One tidy sentence (or two) from model output: no line breaks, quotes,
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
        f"- {h['name']} ({h['difficulty']}): {h['rate7']}% last 7 days, {h['rate30']}% last 30 days, "
        f"{h['streak']}-day streak, {'done' if h['doneToday'] else 'not done'} today, "
        f"missed days this week cost {h['pointsLost7']} DI points"
    )


def build_prompt(username: str, m: dict) -> str:
    score = m["score"]
    working = "\n".join(_habit_line(h) for h in m["working"]) or "- none yet"
    holding = "\n".join(_habit_line(h) for h in m["holdingBack"]) or "- none"
    plan = "\n".join(f"- {p['name']}: completing it today adds +{p['impact']} DI" for p in m["plan"]) or "- everything is done today"
    weekday = (
        f"Best weekday: {m['bestWeekday']}. Worst weekday: {m['worstWeekday']}."
        if m["bestWeekday"]
        else "Not enough history for a weekday pattern."
    )
    tone = (
        "This user is in their first 3 days. Be welcoming and instructional. Never criticise; teach how the system works."
        if m["isNewUser"]
        else "Be a direct, honest coach. Praise real wins specifically. Name real problems plainly. No insults, no drama."
    )
    note_names = [h["name"] for h in m["working"] + m["holdingBack"]]
    plan_names = [p["name"] for p in m["plan"]]

    return f"""You are CIPHER, the performance analyst inside ASCEND, a habit tracker.
Every number below is already calculated and correct. Do not invent, change or round any number.

USER: {username}
Days tracked: {m['daysTracked']}
Discipline Index (DI, 7-day average, 0-100): {score['value']}
30-day average daily score: {score['baseline']}
DI 7 days ago: {score['weekAgo']} (change {score['momentum']:+d})
Highest DI possible today if everything is completed: {score['maxToday']}
Execution type: {m['personality']['type']} ({m['personality']['evidence']})

WHAT IS WORKING:
{working}

WHAT IS HOLDING THEM BACK:
{holding}

WEEKDAY PATTERN: {weekday}

TODAY'S BEST MOVES:
{plan}

TONE: {tone}
Address {username} as "you". Use plain everyday words. Do not use the words "protocol" or "operator".

Respond with ONLY this JSON:
{{
  "verdict": "2 short sentences starting with '{username},'. The single most important thing about their current state.",
  "personalityInsight": "1-2 sentences explaining what their execution type means for them and how to use it.",
  "habitNotes": {{ {", ".join(f'"{n}": "one sentence"' for n in note_names)} }},
  "patternNote": "one sentence about the weekday pattern, or an empty string if there is none",
  "planActions": {{ {", ".join(f'"{n}": "a concrete action for today, max 14 words"' for n in plan_names)} }}
}}"""


def _default_verdict(username: str, m: dict) -> str:
    score = m["score"]
    if m["isNewUser"]:
        return f"{username}, you are in your first days. Check off what you complete and your Discipline Index will build up over the week."
    relation = "above" if score["value"] > score["baseline"] else "below" if score["value"] < score["baseline"] else "level with"
    return f"{username}, your Discipline Index is {score['value']}, {relation} your 30-day average of {score['baseline']}."


def build_analysis(username: str, m: dict, ai: Optional[dict]) -> dict:
    """The full v2 analysis. `ai` is the parsed model JSON, or None."""
    ai = ai or {}
    notes = ai.get("habitNotes") if isinstance(ai.get("habitNotes"), dict) else {}
    actions = ai.get("planActions") if isinstance(ai.get("planActions"), dict) else {}

    def working_item(h: dict) -> dict:
        default = f"{h['rate7']}% this week" + (f" and a {h['streak']}-day streak." if h["streak"] > 1 else ".")
        return {**_public_habit(h), "note": _clean(notes.get(h["name"]), 30) or default}

    def holding_item(h: dict) -> dict:
        default = f"Missed days this week cost you {h['pointsLost7']} DI points."
        return {**_public_habit(h), "note": _clean(notes.get(h["name"]), 30) or default}

    return {
        "version": VERSION,
        "analyzedAt": datetime.now(timezone.utc).isoformat(),
        "narrative": bool(ai),
        "status": m["status"],
        "isNewUser": m["isNewUser"],
        "daysTracked": m["daysTracked"],
        "score": m["score"],
        "metrics": m["metrics"],
        "verdict": _clean(ai.get("verdict"), 45) or _default_verdict(username, m),
        "personality": {
            **m["personality"],
            "insight": _clean(ai.get("personalityInsight"), 40) if m["personality"]["type"] != "CALIBRATING" else "",
        },
        "working": [working_item(h) for h in m["working"]],
        "holdingBack": [holding_item(h) for h in m["holdingBack"]],
        "weekdays": m["weekdays"],
        "bestWeekday": m["bestWeekday"],
        "worstWeekday": m["worstWeekday"],
        "patternNote": _clean(ai.get("patternNote"), 30) if m["bestWeekday"] else "",
        "plan": [
            {**p, "action": _clean(actions.get(p["name"]), 16) or f"Complete {p['name']} today."}
            for p in m["plan"]
        ],
        "changes": [],
        "snapshot": m["snapshot"],
    }


def _public_habit(h: dict) -> dict:
    return {
        "name": h["name"],
        "rate7": h["rate7"],
        "rate30": h["rate30"],
        "trend": h["trend"],
        "streak": h["streak"],
        "pointsLost7": h["pointsLost7"],
    }


def generate_narrative(username: str, m: dict) -> Optional[dict]:
    """Asks Groq for the commentary. None if Groq is unavailable or the reply
    isn't usable JSON."""
    raw = groq_client.call_groq(build_prompt(username, m), temperature=0.6, max_tokens=700, json_mode=True)
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
