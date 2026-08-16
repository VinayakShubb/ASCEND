"""Port of frontend/src/utils/habitIntent.ts.

Guesses what a habit is "for" from its name, so the AI prompts in
ai_brief.py / ai_coach.py can reason about it (e.g. "gym" implies physical
training, so success = finishing the session, not just showing up).
"""

import re

_HABIT_INTENT_RULES: list[tuple[re.Pattern, str]] = [
    (
        re.compile(r"\b(workout|gym|lift|lifting|cardio|run|running|jog|train|training|exercise|pushup|squat)\b", re.I),
        "physical training and recovery discipline; measure by finishing the planned session",
    ),
    (
        re.compile(r"\b(no\s*n|nonut|no\s*nut|nofap|no\s*fap|no\s*porn|dopamine detox|no social media)\b", re.I),
        "impulse-control protocol; success means resisting urges and avoiding known triggers",
    ),
    (
        re.compile(r"\b(study|revision|revise|lecture|class|notes|isa|exam|business)\b", re.I),
        "focused academic study block; success means deep, distraction-free learning time",
    ),
    (
        re.compile(r"\b(code|coding|build|project|ship|leetcode|dev)\b", re.I),
        "skill-building output session; success means producing measurable work, not just planning",
    ),
    (
        re.compile(r"\b(meditat|breath|prayer|mindful|journal|gratitude|reflection)\b", re.I),
        "mental clarity routine; success means a completed reflective or mindfulness session",
    ),
    (
        re.compile(r"\b(sleep|wake|morning|night|bed)\b", re.I),
        "sleep/wake rhythm protocol; success means following the target schedule consistently",
    ),
    (
        re.compile(r"\b(bath|shower|hygiene|clean)\b", re.I),
        "personal hygiene baseline; success means completing the full routine on time",
    ),
    (
        re.compile(r"\b(diet|meal|protein|water|hydrate|nutrition|calorie)\b", re.I),
        "nutrition consistency protocol; success means meeting the planned intake target",
    ),
]


def _category_fallback_meaning(category: str | None) -> str:
    category_key = (category or "").lower()
    if "health" in category_key or "fitness" in category_key:
        return "health discipline protocol; execute the planned routine with consistency"
    if "learning" in category_key or "career" in category_key:
        return "skill-growth protocol; complete focused, measurable progress work"
    if "mindful" in category_key:
        return "mindfulness protocol; complete a short focused reset"
    if "creative" in category_key:
        return "creative output protocol; produce concrete work, not only ideas"
    return "daily consistency protocol; complete it fully and on time"


def _normalize_name(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[_-]+", " ", name)
    name = re.sub(r"[^\w\s]", " ", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip()


def infer_habit_intent(name: str, category: str | None = None) -> str:
    normalized_name = _normalize_name(name)
    for pattern, meaning in _HABIT_INTENT_RULES:
        if pattern.search(normalized_name):
            return meaning
    return _category_fallback_meaning(category)


def build_habit_intent_context(habits: list[dict]) -> str:
    if not habits:
        return "- No active protocols."
    return "\n".join(f"- {h['name']}: {infer_habit_intent(h['name'], h.get('category'))}" for h in habits)
