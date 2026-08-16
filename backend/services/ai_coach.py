"""Port of frontend/src/utils/aiCoach.ts -- the "Live AI Coach" sidebar
insight and the larger "CIPHER" behavioral analysis.

Same-day caching (localStorage in the original) stays a frontend concern;
these functions are stateless and just compute + call Groq every time
they're invoked. The frontend decides whether it even needs to call this
endpoint today.
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

    seven_days_ago = date.today() - timedelta(days=6)
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

def get_coach_insight(user_id: str, habits: list[dict], logs: list[dict]) -> Optional[dict]:
    discipline_index = calculations.calculate_discipline_index(habits, logs)
    today_str = date.today().isoformat()
    today_completion_percent = round(calculations.calculate_daily_completion(habits, logs, today_str))
    day_of_week = DAY_NAMES[(date.today().weekday() + 1) % 7]  # Python Mon=0 -> JS-style Sun=0

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


# -------------------------------------------------------------------------
# FEATURE 4 -- CIPHER Analysis (Operations sidebar page)
# -------------------------------------------------------------------------

def _enforce_timeline_math(timeline_comments: Optional[dict], ctx: dict) -> dict:
    comments = timeline_comments or {}
    normalized: dict[str, str] = {}

    keys = set(comments.keys())
    keys.add(ctx["best_day_date"])
    keys.add("today")
    if ctx["dead_streak_start_date"]:
        keys.add(ctx["dead_streak_start_date"])

    def normalize_non_today_text(text: str) -> str:
        output = re.sub(r"\bdiscipline\s+index\b", "daily weighted score", text, flags=re.I)
        output = re.sub(r"(\d+)\s*/\s*100\s+index", r"\1/100 daily weighted score", output, flags=re.I)
        output = re.sub(r"\bindex\b", "daily weighted score", output, flags=re.I)
        return _normalize_date_mentions(output).strip()

    for key in keys:
        raw = (comments.get(key) or "").strip()

        if key == "today":
            normalized["today"] = f"{ctx['user_id']}, today's Discipline Index (7-day average) is {ctx['discipline_index']}/100."
            continue

        if key == ctx["best_day_date"]:
            base = normalize_non_today_text(raw)
            normalized[key] = _normalize_date_mentions(
                f"{base} Best day daily weighted score: {ctx['best_day_score']}/100."
                if base
                else f"Best day daily weighted score: {ctx['best_day_score']}/100."
            )
            continue

        if ctx["dead_streak_start_date"] and key == ctx["dead_streak_start_date"]:
            base = normalize_non_today_text(raw)
            normalized[key] = _normalize_date_mentions(
                f"{base} Daily weighted score was 0/100." if base else "Daily weighted score was 0/100."
            )
            continue

        normalized[key] = normalize_non_today_text(raw)

    return normalized


def get_cipher_analysis(
    user_id: str,
    user_created_at: Optional[str],
    habits: list[dict],
    logs: list[dict],
    is_new_user: bool = False,
) -> Optional[dict]:
    active_habits = [h for h in habits if not h["archived"]]
    if not active_habits:
        return None
    habit_intent_context = habit_intent.build_habit_intent_context(active_habits)

    today_str = date.today().isoformat()
    discipline_index = calculations.calculate_discipline_index(habits, logs)

    user_registration_raw = datetime.fromisoformat(user_created_at.replace("Z", "+00:00")) if user_created_at else datetime.now()
    user_registration_date = user_registration_raw.date().isoformat()
    user_date = date.fromisoformat(user_registration_date)
    today = date.today()
    days_since_registration = max(1, abs((today - user_date).days) + 1)

    # Per-habit stats
    habit_performances = []
    cutoff_30d = date.today() - timedelta(days=30)
    for h in active_habits:
        h_logs = [l for l in logs if l["habit_id"] == h["id"] and l["status"] == "completed"]
        valid_days = min(30, days_since_registration)
        completions_30d = sum(1 for l in h_logs if date.fromisoformat(l["date"]) >= cutoff_30d)
        rate_30d = round((completions_30d / valid_days) * 100) if valid_days > 0 else 0
        streak = calculations.get_streak(h["id"], logs, today_str)

        habit_performances.append(
            {
                "id": h["id"],
                "name": h["name"],
                "difficulty": h["difficulty"],
                "category": h["category"],
                "rate30d": rate_30d,
                "completions30d": completions_30d,
                "validDays": valid_days,
                "streak": streak,
                "totalCompletions": len(h_logs),
                "isEasy": h["difficulty"] == "easy",
                "isHard": h["difficulty"] in ("hard", "extreme"),
            }
        )

    habit_details_obj = "\\n".join(
        f"  • {h['name']} [{h['difficulty']}] [{h['category']}]\n"
        f"       30D: {h['rate30d']}% ({h['completions30d']}/{h['validDays']} days)\n"
        f"       Streak: {h['streak']} days | Total completions ever: {h['totalCompletions']}"
        for h in habit_performances
    )

    # Daily scores history (registration to today, max 100 days)
    max_days_to_analyze = min(100, days_since_registration)
    daily_scores = []
    best_day = {"date": "", "score": -1}
    longest_dead_streak = 0
    current_dead_streak = 0
    biggest_drop = 0
    days_at_100 = 0
    days_at_0 = 0
    days_above_70 = 0
    dead_streak_starts: list[str] = []
    missed_pairs_count = 0
    first_half_sum = 0.0
    second_half_sum = 0.0
    weekend_pcts: list[float] = []
    weekday_pcts: list[float] = []
    last_score = -1
    half_mark = max_days_to_analyze // 2

    for i in range(max_days_to_analyze - 1, -1, -1):
        d = date.today() - timedelta(days=i)
        date_str_check = d.isoformat()
        score = round(calculations.calculate_weighted_score(habits, logs, date_str_check))
        raw_pct = round(calculations.calculate_daily_completion(habits, logs, date_str_check))
        daily_scores.append({"date": date_str_check, "score": score, "pct": raw_pct})

        if score > best_day["score"]:
            best_day = {"date": date_str_check, "score": score}

        if score == 0:
            if current_dead_streak == 0:
                dead_streak_starts.append(date_str_check)
            current_dead_streak += 1
            longest_dead_streak = max(longest_dead_streak, current_dead_streak)
        else:
            if current_dead_streak >= 2:
                missed_pairs_count += 1
            current_dead_streak = 0

        if last_score != -1:
            drop = last_score - score
            if drop > biggest_drop:
                biggest_drop = drop
        last_score = score

        if raw_pct == 100:
            days_at_100 += 1
        if raw_pct == 0:
            days_at_0 += 1
        if raw_pct >= 70:
            days_above_70 += 1

        if i >= half_mark:
            first_half_sum += score
        else:
            second_half_sum += score

        day_of_week = d.weekday()  # Mon=0..Sun=6
        if day_of_week in (5, 6):  # Sat, Sun
            weekend_pcts.append(raw_pct)
        else:
            weekday_pcts.append(raw_pct)

    total_analyzed = len(daily_scores)
    detected_type = "CONSISTENT BUILDER"

    avg_first_half = first_half_sum / max(1, max_days_to_analyze // 2)
    avg_second_half = second_half_sum / max(1, -(-max_days_to_analyze // 2))  # ceil division

    avg_weekend = sum(weekend_pcts) / len(weekend_pcts) if weekend_pcts else 0
    avg_weekday = sum(weekday_pcts) / len(weekday_pcts) if weekday_pcts else 0

    easy_habits = [h for h in habit_performances if h["isEasy"]]
    avg_easy = sum(h["rate30d"] for h in easy_habits) / len(easy_habits) if easy_habits else 0
    hard_habits = [h for h in habit_performances if h["isHard"]]
    avg_hard = sum(h["rate30d"] for h in hard_habits) / len(hard_habits) if hard_habits else 0

    if total_analyzed > 0 and days_above_70 > 0 and (days_at_0 / total_analyzed) > 0.5:
        detected_type = "BURST EXECUTOR"
    elif total_analyzed > 0 and (days_at_100 + days_at_0) / total_analyzed > 0.6:
        detected_type = "ALL OR NOTHING"
    elif total_analyzed > 0 and (total_analyzed - days_at_0) / total_analyzed < 0.2:
        detected_type = "GHOST MODE"
    elif avg_easy > 60 and avg_hard < 30:
        detected_type = "SELECTIVE EXECUTOR"
    elif abs(avg_weekend - avg_weekday) > 20:
        detected_type = "WEEKEND WARRIOR"
    elif avg_first_half > avg_second_half + 10 and max_days_to_analyze >= 7:
        detected_type = "DECLINING PERFORMER"
    elif avg_second_half > avg_first_half + 10 and max_days_to_analyze >= 7:
        detected_type = "SLOW STARTER"
    elif missed_pairs_count >= 3:
        detected_type = "COMEBACK KID"
    elif total_analyzed >= 7:
        mon_tue = [d["pct"] for d in daily_scores if date.fromisoformat(d["date"]).weekday() in (0, 1)]
        others = [d["pct"] for d in daily_scores if date.fromisoformat(d["date"]).weekday() not in (0, 1)]
        avg_mon_tue = sum(mon_tue) / len(mon_tue) if mon_tue else 0
        avg_others = sum(others) / len(others) if others else 0
        if avg_mon_tue > avg_others + 25:
            detected_type = "EARLY QUITTER"

    sorted_habits = sorted(habit_performances, key=lambda h: h["rate30d"], reverse=True)
    best_habit = sorted_habits[0]
    worst_habit = sorted_habits[-1]

    daily_scores_str = "\n".join(f"{d['date']}: DAILY_WEIGHTED_SCORE={d['score']}/100" for d in daily_scores)
    dead_streak_start_str = dead_streak_starts[-1] if dead_streak_starts else ""

    new_user_personality = f"""SPECIAL MODE: NEW USER GRACE PERIOD

{user_id} registered only {days_since_registration} days ago. This is their onboarding phase.

YOUR PERSONALITY FOR NEW USERS:
- You are ENCOURAGING, not brutal
- You are a TEACHER, not a judge
- Focus on BUILDING THE HABIT of daily tracking, not performance
- Celebrate small wins: "You logged protocols 2 days in a row — that's momentum"
- If they missed a day: "That's okay. The system is new. Just open the app again today."
- NO harsh language. NO confrontation. NO disappointment.
- Explain what the Discipline Index means and how it grows over time
- Tell them: "After day 3, CIPHER becomes more direct. For now, focus on consistency."

RULES:
- Never call them "dismal" or "critical" or "slipping"
- Never use red flag language like "concerning" or "failure"
- Frame everything as learning: "You're figuring out your rhythm"
- Remind them the real analysis starts after day 3"""

    veteran_personality = (
        "You are a brutal, honest performance coach. You appreciate genuine good work.\n"
        "You call out failure directly. You never sugarcoat. You never use passive voice."
    )

    prompt = f"""You are CIPHER — the AI core of ASCEND, a personal discipline operating system.
{new_user_personality if is_new_user else veteran_personality}

USER: {user_id}
Registration: {user_registration_date} ({days_since_registration} days ago)
Discipline Index: {discipline_index}/100
Execution Type Detected: {detected_type}

PROTOCOL DATA:
{habit_details_obj}

PROTOCOL INTENT CONTEXT:
{habit_intent_context}

DAILY HISTORY (registration to today):
{daily_scores_str}

KEY COMPUTED STATS:
- Best habit: {best_habit['name']} at {best_habit['rate30d']}%
- Worst habit: {worst_habit['name']} at {worst_habit['rate30d']}%
- Best day: {best_day['date']} with daily weighted score {best_day['score']}/100
- Longest dead streak: {longest_dead_streak} consecutive days at zero
- Biggest single drop: -{biggest_drop} points in 24 hours
- Total habits: {len(active_habits)}
- Timeline Anchors available: "{user_registration_date}", "{best_day['date']}", "{dead_streak_start_str}", "today"

RULES — CRITICAL:
- Always address {user_id} directly. Use "you" and "your". Never "the user" or "operator".
- Start operatorVerdict with "{user_id},"
- Never write habit names with brackets like [hard] — write naturally.
- Reference specific dates, percentages, habit names from the data above.
- Use PROTOCOL INTENT CONTEXT to understand abbreviations and protocol meaning before giving advice.
- Date format for any explicit date in your writing must be exactly "dd Mon yyyy" (example: 22 Feb 2026).
MATH DEFINITIONS (NON-NEGOTIABLE):
- Discipline Index (DI) = 7-day rolling average. Current DI is exactly {discipline_index}/100.
- Daily Weighted Score = single-day score for a specific date from DAILY HISTORY.
- Completion % = raw completion rate for a day/window.
- NEVER call a Daily Weighted Score "index".
- For date-level events (best day, worst day, dead streak start), use the phrase "daily weighted score", not "index".
- Only use "Discipline Index" when referring to the current 7-day DI value.
{"- Be encouraging and patient. This is a new user learning the system." if is_new_user else "- Be a coach: brutal when performance is bad, genuinely appreciative when it is good."}
- Every order must be executable TONIGHT, not someday.
- Do not repeat the same advice across multiple sections.
- If data is sparse (under 5 days), acknowledge it directly and give what you can.
- DO NOT ONLY TALK ABOUT THE DISCIPLINE INDEX. Reference completion rates, streaks, specific habit performance, behavioral patterns, consistency, and trends. The DI is just one metric — you have access to completion percentages, streaks, daily scores, best/worst habits, and more. Use ALL of them.
- When mentioning numbers, ONLY use exact numbers from the data provided. NEVER invent or round numbers that aren't in the data.

Respond ONLY with this exact JSON. No markdown. No text outside the JSON:

{{
  "status": "{'solid' if is_new_user else 'elite|solid|slipping|critical'}",
  "operatorVerdict": "...",
  "timelineComments": {{
    "{user_registration_date}": "one line CIPHER comment on day one",
    "{best_day['date']}": "one line on their best day",
    {f'"{dead_streak_start_str}": "one line on when the dead streak began",' if dead_streak_start_str else ""}
    "today": "one line about today's Discipline Index (7-day average): {discipline_index}/100"
  }},
  "executionType": "{detected_type}",
  "personalityInsight": "...",
  "hallOfFame": {{
    "bestProtocol": "{best_habit['name']}",
    "bestProtocolComment": "...",
    "bestDayComment": "..."
  }},
  "hallOfShame": {{
    "worstProtocol": "{worst_habit['name']}",
    "worstProtocolComment": "...",
    "worstStreakComment": "..."
  }},
  "lowlightsComments": {{
    "longestDeadStreak": "...",
    "worstDay": "...",
    "mostBrokenHabit": "...",
    "biggestDrop": "..."
  }},
  "ceilingInsight": "...",
  "biggestMistakeName": "...",
  "biggestMistake": "...",
  "biggestWinName": "...",
  "biggestWin": "...",
  "orders": [
    {{ "rank": 1, "action": "...", "estimatedImpact": "..." }},
    {{ "rank": 2, "action": "...", "estimatedImpact": "..." }},
    {{ "rank": 3, "action": "...", "estimatedImpact": "..." }}
  ]
}}

Only reference data provided above. Do not invent events, dates, or patterns."""

    raw = groq_client.call_groq(prompt, temperature=0.7, max_tokens=1800)
    if raw is None:
        return None

    clean_json_str = re.sub(r"```json|```", "", raw, flags=re.I).strip()
    try:
        parsed = json.loads(clean_json_str)
        if not parsed or not parsed.get("status") or not parsed.get("orders"):
            raise ValueError("Malformed AI output")
    except (json.JSONDecodeError, ValueError):
        print(f"CIPHER JSON parse failed. Raw response: {raw}")
        return None

    if is_new_user:
        parsed["status"] = "elite" if discipline_index >= 70 else "solid"
    else:
        parsed["status"] = (
            "elite" if discipline_index >= 80 else "solid" if discipline_index >= 50 else "slipping" if discipline_index >= 20 else "critical"
        )

    parsed.setdefault("hallOfFame", {"bestProtocol": "", "bestProtocolComment": "", "bestDayComment": ""})
    parsed.setdefault("hallOfShame", {"worstProtocol": "", "worstProtocolComment": "", "worstStreakComment": ""})

    for field in ("operatorVerdict", "personalityInsight", "ceilingInsight", "biggestMistake", "biggestWin"):
        parsed[field] = _normalize_date_mentions(parsed.get(field) or "")

    parsed["hallOfFame"]["bestDayComment"] = _normalize_date_mentions(parsed["hallOfFame"].get("bestDayComment") or "")
    parsed["hallOfFame"]["bestProtocolComment"] = _normalize_date_mentions(parsed["hallOfFame"].get("bestProtocolComment") or "")
    parsed["hallOfShame"]["worstProtocolComment"] = _normalize_date_mentions(parsed["hallOfShame"].get("worstProtocolComment") or "")
    parsed["hallOfShame"]["worstStreakComment"] = _normalize_date_mentions(parsed["hallOfShame"].get("worstStreakComment") or "")

    lowlights = parsed.get("lowlightsComments") or {}
    parsed["lowlightsComments"] = {
        "longestDeadStreak": _normalize_date_mentions(_sanitize_sentence(lowlights.get("longestDeadStreak") or "", 18)),
        "worstDay": _normalize_date_mentions(_sanitize_sentence(lowlights.get("worstDay") or "", 18)),
        "mostBrokenHabit": _normalize_date_mentions(_sanitize_sentence(lowlights.get("mostBrokenHabit") or "", 18)),
        "biggestDrop": _normalize_date_mentions(_sanitize_sentence(lowlights.get("biggestDrop") or "", 18)),
    }

    parsed["orders"] = [
        {
            **order,
            "action": _normalize_date_mentions(order.get("action") or ""),
            "estimatedImpact": _normalize_date_mentions(order.get("estimatedImpact") or ""),
        }
        for order in (parsed.get("orders") or [])
    ]

    parsed["timelineComments"] = _enforce_timeline_math(
        parsed.get("timelineComments"),
        {
            "user_id": user_id,
            "discipline_index": discipline_index,
            "best_day_date": best_day["date"],
            "best_day_score": best_day["score"],
            "dead_streak_start_date": dead_streak_start_str,
        },
    )
    parsed["analyzedAt"] = datetime.utcnow().isoformat()
    return parsed
