"""Server-side storage and daily limits for AI output (ai_generations table).

Every successful generation is stored. That gives:
- the same result on every device, instead of a per-browser localStorage cache;
- a hard per-user, per-day cap on Groq calls, so spamming a button can't run
  up the bill;
- something to show when the cap is reached or Groq is down: the latest
  stored result.

Rows are keyed by the user's *local* date, so "today" means the user's day,
not the server's.
"""

import hashlib
import json
import logging
from datetime import date, datetime, timezone
from typing import Callable, Optional

from postgrest.exceptions import APIError

import database

logger = logging.getLogger(__name__)

TABLE = "ai_generations"


def input_fingerprint(*parts) -> str:
    """Stable hash of whatever data a generation was based on. Two requests
    with the same fingerprint would send Groq the same prompt."""
    payload = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode()).hexdigest()


def _query(build) -> list[dict]:
    """Runs a read against ai_generations. If the table is unreachable (for
    example the migration hasn't been applied yet) the AI features keep
    working, just without limits or history, instead of returning 500s."""
    try:
        return build(database.db_client.table(TABLE)).execute().data or []
    except APIError:
        logger.exception("Could not read %s", TABLE)
        return []


def newest_today(user_id: str, feature: str, local_date: date, accept=None) -> Optional[dict]:
    """The latest stored result for today, if there is one worth showing. Lets
    a route hand something back straight away and refresh behind the response
    instead of making the page wait on a model."""
    rows = _rows_for_day(user_id, feature, local_date)
    if accept is not None:
        rows = [r for r in rows if accept(r.get("output") or {})]
    return rows[0] if rows else None


def _rows_for_day(user_id: str, feature: str, local_date: date) -> list[dict]:
    return _query(
        lambda t: t.select("*")
        .eq("user_id", user_id)
        .eq("feature", feature)
        .eq("local_date", local_date.isoformat())
        .order("created_at", desc=True)
    )


def latest(user_id: str, feature: str, accept: Optional[Callable[[dict], bool]] = None) -> Optional[dict]:
    """Most recent stored row for this feature on any day. With `accept`,
    the most recent row whose output passes it (e.g. a current format)."""
    rows = _query(
        lambda t: t.select("*")
        .eq("user_id", user_id)
        .eq("feature", feature)
        .order("created_at", desc=True)
        .limit(1 if accept is None else 20)
    )
    if accept is not None:
        rows = [r for r in rows if accept(r.get("output") or {})]
    return rows[0] if rows else None


def recent_outputs(user_id: str, feature: str, limit: int) -> list[dict]:
    rows = _query(
        lambda t: t.select("output").eq("user_id", user_id).eq("feature", feature).order("created_at", desc=True).limit(limit)
    )
    return [row["output"] for row in rows if row.get("output")]


def _store(user_id: str, feature: str, local_date: date, fingerprint: str, output: dict) -> None:
    try:
        database.db_client.table(TABLE).insert(
            {
                "user_id": user_id,
                "feature": feature,
                "local_date": local_date.isoformat(),
                "input_hash": fingerprint,
                "output": output,
            }
        ).execute()
    except APIError:
        # Storing is best-effort: the user still gets the result, it just
        # won't count toward the limit or be reusable later.
        logger.exception("Could not store %s generation", feature)


def _age_seconds(row: dict) -> float:
    created = datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00"))
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - created).total_seconds()


def get_or_generate(
    user_id: str,
    feature: str,
    local_date: date,
    fingerprint: str,
    generate: Callable[[], Optional[dict]],
    daily_limit: int,
    cooldown_seconds: int = 0,
    reuse_same_input: bool = False,
    fall_back_to_older_days: bool = False,
    accept: Optional[Callable[[dict], bool]] = None,
) -> Optional[dict]:
    """Returns a stored result when one should be reused, otherwise calls
    `generate()` and stores what it returns.

    A stored result for today is reused when:
    - today's limit is already used up (the user just sees the latest one);
    - the latest one is younger than `cooldown_seconds`;
    - `reuse_same_input` is set and nothing in the user's data changed since
      the latest one (same prompt in, so a new call would be wasted).

    `generate()` returning None means Groq failed. Nothing is stored and
    today's latest stored result is returned instead, or, with
    `fall_back_to_older_days`, the latest from any day (or None).

    `accept` ignores stored rows whose output fails it (e.g. results saved in
    an older format); they neither count toward the limit nor get reused.
    """
    today_rows = _rows_for_day(user_id, feature, local_date)
    if accept is not None:
        today_rows = [r for r in today_rows if accept(r.get("output") or {})]
    newest_today = today_rows[0] if today_rows else None

    if newest_today:
        if len(today_rows) >= daily_limit:
            return newest_today["output"]
        if cooldown_seconds and _age_seconds(newest_today) < cooldown_seconds:
            return newest_today["output"]
        if reuse_same_input and newest_today.get("input_hash") == fingerprint:
            return newest_today["output"]

    output = generate()
    if output is None:
        fallback = newest_today or (latest(user_id, feature, accept) if fall_back_to_older_days else None)
        return fallback["output"] if fallback else None

    _store(user_id, feature, local_date, fingerprint, output)
    return output
