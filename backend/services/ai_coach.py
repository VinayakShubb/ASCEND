"""Port of frontend/src/utils/aiCoach.ts -- the "Live AI Coach" sidebar
insight, plus small text helpers. (CIPHER lives in cipher_metrics.py and
cipher_analysis.py.)

These functions are stateless and just compute + call Groq every time
they're invoked. Daily limits and storage of past results live in
services/ai_generations.py and routes/ai.py.
"""

import json
import re
from datetime import date, datetime, timedelta
from typing import Optional

from services import calculations, groq_client, habit_intent

DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

_MONTH_MAP = {
    "january": "jan", "jan": "jan",
    "february": "feb", "feb": "feb",
    "march": "mar", "mar": "mar",
    "april": "apr", "apr": "apr",
    "may": "may",
    "june": "jun", "jun": "jun",
    "july": "jul", "jul": "jul",
    "august": "aug", "aug": "aug",
    "september": "sep", "sept": "sep", "sep": "sep",
    "october": "oct", "oct": "oct",
    "november": "nov", "nov": "nov",
    "december": "dec", "dec": "dec",
}


# -------------------------------------------------------------------------
# Text-normalization helpers (shared by coach + cipher)
# -------------------------------------------------------------------------

def _trim_words(text: str, max_words: int) -> str:
    words = [w for w in text.split() if w]
    return " ".join(words[:max_words])


def _sanitize_sentence(text: str, max_words: int = 24) -> str:
    cleaned = re.sub(r"[\r\n]+", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r'^["\'\s]+|["\'\s]+$', "", cleaned).strip()
    if not cleaned:
        return ""
    trimmed = _trim_words(cleaned, max_words)
    return trimmed if re.search(r"[.!?]$", trimmed) else f"{trimmed}."


def _format_date_compact(date_input: str) -> str:
    try:
        parsed = datetime.fromisoformat(date_input.replace("Z", "+00:00"))
    except ValueError:
        return date_input
    return parsed.strftime("%d %b %Y").lower()


def _normalize_date_mentions(text: str) -> str:
    output = re.sub(
        r"\b(\d{4}-\d{2}-\d{2})\b",
        lambda m: _format_date_compact(m.group(1)),
        text,
    )

    def _replace_day_month_year(m: re.Match) -> str:
        day, month, year = m.group(1), m.group(2), m.group(3)
        normalized_month = _MONTH_MAP.get(month.lower())
        if not normalized_month:
            return f"{day} {month} {year}"
        return f"{day.zfill(2)} {normalized_month} {year}"

    output = re.sub(r"\b(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})\b", _replace_day_month_year, output)

    def _replace_month_day_year(m: re.Match) -> str:
        month, day, year = m.group(1), m.group(2), m.group(3)
        normalized_month = _MONTH_MAP.get(month.lower())
        if not normalized_month:
            return f"{month} {day} {year}"
        return f"{day.zfill(2)} {normalized_month} {year}"

    output = re.sub(r"\b([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b", _replace_month_day_year, output)
    return output


def _weekly_completion_and_streak(habit_id: str, habit_name: str, logs: list[dict], today_str: str) -> tuple[int, int, bool]:
    streak = calculations.get_streak(habit_id, logs, today_str)
    completed_dates = {l["date"] for l in logs if l["habit_id"] == habit_id and l["status"] == "completed"}

    seven_days_ago = date.fromisoformat(today_str) - timedelta(days=6)
    weekly_completion = 0
    for i in range(7):
        check_date = (seven_days_ago + timedelta(days=i)).isoformat()
        if check_date in completed_dates:
            weekly_completion += 1

    completed_today = today_str in completed_dates
    return weekly_completion, streak, completed_today


# -------------------------------------------------------------------------
# FEATURE 3 -- Live AI Coach (Analytics sidebar)
# -------------------------------------------------------------------------

def get_coach_insight(user_id: str, habits: list[dict], logs: list[dict], today: Optional[date] = None) -> Optional[dict]:
    today = today or date.today()
    today_str = today.isoformat()
    discipline_index = calculations.calculate_discipline_index(habits, logs, today_str)
    today_completion_percent = round(calculations.calculate_daily_completion(habits, logs, today_str))
    day_of_week = DAY_NAMES[(today.weekday() + 1) % 7]  # Python Mon=0 -> JS-style Sun=0

    active_habits = [h for h in habits if not h["archived"]]
    if not active_habits:
        return None
    habit_intent_context = habit_intent.build_habit_intent_context(active_habits)

    habit_lines = []
    for h in active_habits:
        weekly_completion, streak, completed_today = _weekly_completion_and_streak(h["id"], h["name"], logs, today_str)
        habit_lines.append(
            f"  • {h['name']} — {weekly_completion}/7 this week, {streak} day streak, "
            f"{'✓ done today' if completed_today else '✗ not done today'}"
        )
    habit_details = "\n".join(habit_lines)

    prompt = f"""You are the AI core of ASCEND — a strict discipline coach. Your tone adapts exactly to the user's performance.

USER PERFORMANCE DATA:
- Discipline Index: {discipline_index}/100
- Today's Completion: {today_completion_percent}%
- Day: {day_of_week}
- Protocols:
{habit_details}
- Habit intent context:
{habit_intent_context}

Status thresholds and TONALITY RULES:
- elite (index >= 80): Tone = Appreciating, acknowledging high performance, commanding them to maintain the elite standard.
- solid (index >= 50 and < 80): Tone = Balanced, direct. Acknowledge good work but push for more consistency.
- slipping (index >= 20 and < 50): Tone = Sharp, warning. Point out the exact failures.
- critical (index < 20): Tone = Scolding, ordering, and brutal. Do not suggest; COMMAND them to fix their failures immediately for their own improvement.

The user's name is {user_id}. Address them by name directly. Never use the word 'operator'.
Speak directly to {user_id} in second person. Use 'you' and 'your'. Be direct like a drill sergeant.
Use their actual habit names and actual numbers. Never write in third person. Never be passive.
Interpret each habit with the provided intent context before giving insight or action.

Respond ONLY with this exact JSON:
{{
  "status": "elite|solid|slipping|critical",
  "headline": "max 8 words, current state summary",
  "insight": "2 sentences using actual habit names, pointing out the most important pattern. If multiple protocols are failing, mention ALL of them.",
  "action": "one concrete thing to do right now, specific not vague"
}}

Rules:
- Give a response that perfectly matches the Tonality Rule for their current status.
- Use actual habit names from the data, never generic references
- Use Habit intent context to infer what each protocol means in real life.
- DO NOT mention the difficulty level (e.g. hard, medium) in your response. Just use the name.
- If a habit has 0/7 or low completion this week, call it out directly.
- The action must be specific: not "be consistent" but "complete [Habit Name] tonight before sleep" or "do [Habit Name] immediately".

No markdown. No explanation outside the JSON.
IMPORTANT: Only reference habits and data explicitly provided. Do not invent anything."""

    raw = groq_client.call_groq(prompt, temperature=0.7, max_tokens=300)
    if raw is None:
        return None

    clean_json_str = re.sub(r"```json|```", "", raw, flags=re.I).strip()
    try:
        parsed = json.loads(clean_json_str)
    except json.JSONDecodeError:
        print(f"AI JSON parse failed. Raw response: {raw}")
        return None

    # Force strict mathematical status to prevent AI hallucination.
    parsed["status"] = (
        "elite" if discipline_index >= 80 else "solid" if discipline_index >= 50 else "slipping" if discipline_index >= 20 else "critical"
    )
    return parsed
