import logging
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import ValidationError

import config
from deps import derive_username, get_current_user, get_user_today
from models.ai import BriefOutput, BriefRequest, CipherAnalysisV2, CoachOutput
from services import ai_brief, ai_coach, ai_generations, cipher_analysis, cipher_metrics
from services.user_data import get_habits, get_logs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

RECENT_QUOTES_TO_AVOID = 30


def _data_fingerprint(habits: list[dict], logs: list[dict], *extra) -> str:
    """Fingerprint of the fields the AI prompts actually read, so editing an
    unrelated column doesn't count as "your data changed"."""
    habit_part = sorted(
        (h["id"], h["name"], h["difficulty"], h.get("category"), h["archived"]) for h in habits
    )
    log_part = sorted((l["habit_id"], l["date"]) for l in logs if l.get("status") == "completed")
    return ai_generations.input_fingerprint(habit_part, log_part, *extra)


def _validated(model, output: Optional[dict]) -> Optional[dict]:
    """Drops AI output that doesn't match the response schema, so a malformed
    reply becomes "AI unavailable" instead of a 500."""
    if output is None:
        return None
    try:
        return model.model_validate(output).model_dump()
    except ValidationError:
        logger.warning("%s from Groq failed validation", model.__name__)
        return None


def _with_timestamp(output: Optional[dict]) -> Optional[dict]:
    """Stamps a once-a-day note with when it was written, so the app can say
    "written at 8:12" instead of passing an old note off as live."""
    if output is None:
        return None
    return {**output, "generatedAt": datetime.now(timezone.utc).isoformat()}


# POST (not GET) because it accepts an optional recent_quotes list in the
# body -- it doesn't change any state the caller can see.
@router.post("/brief", response_model=Optional[BriefOutput])
def get_brief(
    body: BriefRequest,
    current_user: dict = Depends(get_current_user),
    today: date = Depends(get_user_today),
):
    """The home-page Daily Mission Brief: generated once per local day and
    stored, so every device shows the same quote and motivation."""
    user_id = current_user["id"]
    username = derive_username(current_user["user_metadata"], current_user["email"])
    habits = get_habits(user_id)
    logs = get_logs(user_id)

    stored_quotes = [o.get("quote", "") for o in ai_generations.recent_outputs(user_id, "brief", RECENT_QUOTES_TO_AVOID)]
    recent_quotes = [q for q in [*body.recent_quotes, *stored_quotes] if q][-RECENT_QUOTES_TO_AVOID:]

    fallback_brief: dict = {}

    def generate() -> Optional[dict]:
        brief = ai_brief.get_daily_brief(
            username=username,
            habits=habits,
            logs=logs,
            created_at=current_user["created_at"],
            recent_quotes=recent_quotes,
            today=today,
        )
        if brief is None or brief.get("is_fallback"):
            # Don't store the canned fallback as today's brief, or the user
            # would be stuck with it all day once Groq recovers.
            fallback_brief.update(brief or {})
            return None
        return _validated(BriefOutput, brief)

    result = ai_generations.get_or_generate(
        user_id,
        "brief",
        today,
        _data_fingerprint(habits, logs, today.isoformat()),
        generate,
        daily_limit=config.AI_BRIEF_DAILY_LIMIT,
    )
    return result or fallback_brief or None


@router.get("/coach", response_model=Optional[CoachOutput])
def get_coach(current_user: dict = Depends(get_current_user), today: date = Depends(get_user_today)):
    """The analytics sidebar's Live AI Coach: once per local day, stored."""
    user_id = current_user["id"]
    username = derive_username(current_user["user_metadata"], current_user["email"])
    habits = get_habits(user_id)
    logs = get_logs(user_id)

    if not any(not h["archived"] for h in habits):
        return None  # nothing to coach on; don't spend a generation

    return ai_generations.get_or_generate(
        user_id,
        "coach",
        today,
        _data_fingerprint(habits, logs, today.isoformat()),
        lambda: _with_timestamp(_validated(CoachOutput, ai_coach.get_coach_insight(
                    username, habits, logs, today=today, created_at=current_user.get("created_at")
                ))),
        daily_limit=config.AI_COACH_DAILY_LIMIT,
    )


def _is_current_cipher(output: dict) -> bool:
    # Analyses stored before CIPHER v2 have a different shape; skip them.
    return output.get("version") == cipher_analysis.VERSION


@router.get("/cipher", response_model=Optional[CipherAnalysisV2])
def get_cipher(
    is_new_user: bool = Query(False, description="Ignored; worked out from the account's age now."),
    current_user: dict = Depends(get_current_user),
    today: date = Depends(get_user_today),
):
    """Runs a CIPHER analysis. Every number is computed in Python
    (services/cipher_metrics.py); Groq only writes the commentary.

    Users can re-run it as their day progresses, up to AI_CIPHER_DAILY_LIMIT
    times per local day. Past the limit, inside the cooldown, or when nothing
    changed since the last run, the latest stored analysis comes back instead
    of a new Groq call. If Groq is down, the numbers are still returned, with
    plain default sentences (narrative=false), and nothing is stored."""
    user_id = current_user["id"]
    username = derive_username(current_user["user_metadata"], current_user["email"])
    habits = get_habits(user_id)
    logs = get_logs(user_id)

    if not any(not h["archived"] for h in habits):
        return None

    metrics = cipher_metrics.compute_cipher_metrics(habits, logs, today, current_user["created_at"])
    previous = ai_generations.latest(user_id, "cipher", _is_current_cipher)
    previous_snapshot = previous["output"].get("snapshot") if previous else None

    def assemble(narrative: Optional[dict]) -> Optional[dict]:
        analysis = cipher_analysis.build_analysis(username, metrics, narrative)
        analysis["changes"] = cipher_metrics.changes_since(previous_snapshot, metrics["snapshot"])
        return _validated(CipherAnalysisV2, analysis)

    def generate() -> Optional[dict]:
        narrative = cipher_analysis.generate_narrative(username, metrics)
        return assemble(narrative) if narrative is not None else None

    result = ai_generations.get_or_generate(
        user_id,
        "cipher",
        today,
        _data_fingerprint(habits, logs, today.isoformat(), "cipher-v2"),
        generate,
        daily_limit=config.AI_CIPHER_DAILY_LIMIT,
        cooldown_seconds=config.AI_CIPHER_COOLDOWN_SECONDS,
        reuse_same_input=True,
        accept=_is_current_cipher,
    )
    return result if result is not None else assemble(None)


@router.get("/cipher/latest", response_model=Optional[CipherAnalysisV2])
def get_latest_cipher(current_user: dict = Depends(get_current_user)):
    """The most recent stored CIPHER analysis, without generating a new one.
    Lets the CIPHER page show the last analysis instantly on load."""
    row = ai_generations.latest(current_user["id"], "cipher", _is_current_cipher)
    return row["output"] if row else None
