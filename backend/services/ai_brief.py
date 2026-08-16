"""Port of frontend/src/utils/aiBrief.ts (the "Daily Mission Brief" feature).

Same-day caching and the rolling "don't repeat this quote" history used to
live in localStorage on the client. That stays a frontend concern: the
frontend still owns the cache and passes its recent quote history in on each
call (see BriefRequest.recent_quotes) so the "don't repeat" behavior is
preserved without giving the backend its own persistent store for this.
"""

import json
from datetime import date, datetime, timedelta, timezone
import re
from typing import Optional

from services import calculations, groq_client, habit_intent

VALID_STATUSES = {"elite", "solid", "slipping", "critical"}
BRIEF_GRACE_DAYS = 3


def _get_days_since_registration(created_at: Optional[str]) -> int:
    if not created_at:
        return 1
    try:
        parsed = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    except ValueError:
        return 1
    today = datetime.now(timezone.utc).date()
    return max(1, (today - parsed.date()).days + 1)


def _get_status_from_index(discipline_index: int, is_grace_period: bool) -> str:
    if discipline_index >= 80:
        return "elite"
    if discipline_index >= 50:
        return "solid"
    if discipline_index >= 20:
        return "slipping"
    return "slipping" if is_grace_period else "critical"


def _clamp_status_for_grace(status: str, is_grace_period: bool) -> str:
    if not is_grace_period:
        return status
    return "slipping" if status == "critical" else status


def _trim_to_words(text: str, max_words: int) -> str:
    words = [w for w in text.split() if w]
    return " ".join(words[:max_words])


def _normalize_quote(quote: str) -> str:
    cleaned = re.sub(r"[\r\n]+", " ", quote)
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r'^["\']+|["\']+$', "", cleaned).strip()
    fallback = "Discipline is built by what you finish today."
    return _trim_to_words(cleaned or fallback, 18)


def _normalize_motivation(motivation: str, is_grace_period: bool, username: str) -> str:
    if is_grace_period:
        defaults = [
            f"{username}, this is your setup phase. Focus on clean reps today.",
            "Finish your next one or two protocols and build momentum.",
            "Small consistency now becomes your baseline next week.",
        ]
    else:
        defaults = [
            "Execute your next protocol now and raise today's score.",
            "Momentum comes from finishing what is still open today.",
            "One clean push now changes tonight's result.",
        ]

    text = motivation.replace("\r", "\n")
    parts = []
    for line in re.split(r"\n+", text):
        for sentence in re.split(r"(?<=[.!?])\s+", line):
            cleaned = re.sub(r"\s+", " ", sentence)
            cleaned = re.sub(r'^["\'\s-]+|["\'\s-]+$', "", cleaned).strip()
            if cleaned:
                parts.append(cleaned)

    lines = [l for l in (_trim_to_words(p, 16) for p in parts[:3]) if l]
    while len(lines) < 2:
        lines.append(defaults[len(lines)])

    return "\n".join(lines[:3])


def _build_fallback_brief(status: str, is_grace_period: bool, username: str) -> dict:
    return {
        "status": _clamp_status_for_grace(status, is_grace_period),
        "quote": "Start simple. Stack one clean win at a time."
        if is_grace_period
        else "Your next action decides how this day ends.",
        "motivation": _normalize_motivation("", is_grace_period, username),
    }


def get_daily_brief(
    username: str,
    habits: list[dict],
    logs: list[dict],
    created_at: Optional[str] = None,
    recent_quotes: Optional[list[str]] = None,
) -> Optional[dict]:
    recent_quotes = recent_quotes or []
    today_str = date.today().isoformat()

    active_habits = [h for h in habits if not h["archived"]]
    habit_intent_context = habit_intent.build_habit_intent_context(active_habits)
    days_since_registration = _get_days_since_registration(created_at)
    is_grace_period = days_since_registration <= BRIEF_GRACE_DAYS
    discipline_index = calculations.calculate_discipline_index(habits, logs)
    today_weighted_score = round(calculations.calculate_weighted_score(habits, logs, today_str))
    today_completion_percent = round(calculations.calculate_daily_completion(habits, logs, today_str))
    target_status = _get_status_from_index(discipline_index, is_grace_period)
    day_of_week = date.today().strftime("%A")

    habit_lines = []
    seven_days_ago = date.today() - timedelta(days=6)
    for habit in active_habits:
        streak = calculations.get_streak(habit["id"], logs, today_str)
        completed_dates = {l["date"] for l in logs if l["habit_id"] == habit["id"] and l["status"] == "completed"}

        weekly_completion = 0
        for i in range(7):
            check_date = (seven_days_ago + timedelta(days=i)).isoformat()
            if check_date in completed_dates:
                weekly_completion += 1

        completed_today = today_str in completed_dates
        habit_lines.append(
            f"- {habit['name']}: {weekly_completion}/7 this week, {streak} day streak, "
            f"{'done today' if completed_today else 'not done today'}"
        )
    habit_details = "\n".join(habit_lines)

    recent = recent_quotes[-30:]
    forbidden_quotes_text = (
        "DO NOT use any of these quotes as they were used recently:\n" + "\n".join(f'- "{q}"' for q in recent)
        if recent
        else "No quotes used recently."
    )

    prompt = f"""You are the AI core of ASCEND. Generate a short Daily Mission Brief.

USER PERFORMANCE DATA:
- Username: {username}
- Days since registration: {days_since_registration}
- Grace period active: {'YES' if is_grace_period else 'NO'} (grace days are days 1-3)
- Discipline Index (DI): {discipline_index}/100
- Daily Weighted Score (DWS, today only): {today_weighted_score}/100
- Today's Completion: {today_completion_percent}%
- Day: {day_of_week}
- Protocols:
{habit_details}
- Habit intent context:
{habit_intent_context}

MATH DEFINITIONS:
- DI = 7-day rolling average of daily weighted scores.
- DWS = single-day weighted score for today only.

TARGET STATUS BASED ON DATA: {target_status}

TONE RULES:
- If grace period is active, be supportive and instructional.
- During grace period, NEVER shame/scold and NEVER return status "critical".
- Outside grace period: elite = appreciate and challenge; solid = direct and steady; slipping = sharp warning; critical = blunt urgency.

Respond ONLY with this exact JSON format:
{{
  "status": "elite|solid|slipping|critical",
  "quote": "One short line, max 16 words. NEVER REPEAT A FORBIDDEN QUOTE.",
  "motivation": "2 or 3 short lines separated by \\n. Each line max 16 words. Actionable and easy to scan."
}}

Rules:
- Follow the tone rules exactly.
- Use actual habit names from the data.
- Understand each habit using the provided Habit intent context.
- Mention at most 2 habit names total.
- Keep language simple and punchy.
- During grace period, avoid words like "failure", "regret", "pathetic", "waste".
- {forbidden_quotes_text}

No markdown. No explanation outside the JSON.
IMPORTANT: Only reference habits and data explicitly provided."""

    raw = groq_client.call_groq(prompt, temperature=0.9, json_mode=True)
    if raw is None:
        return _build_fallback_brief(target_status, is_grace_period, username)

    try:
        parsed_raw = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return _build_fallback_brief(target_status, is_grace_period, username)

    parsed_status = parsed_raw.get("status") if parsed_raw.get("status") in VALID_STATUSES else target_status

    return {
        "status": _clamp_status_for_grace(parsed_status, is_grace_period),
        "quote": _normalize_quote(parsed_raw.get("quote") or ""),
        "motivation": _normalize_motivation(parsed_raw.get("motivation") or "", is_grace_period, username),
    }
