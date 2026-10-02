"""Thin wrapper around the Groq chat completions API.

This used to be called directly from the browser with the API key baked
into the client bundle (VITE_GROQ_API_KEY). Moving it here means the key
never leaves the server.

Several keys can be configured (config.GROQ_API_KEYS). They are tried in
order and a key that just failed with a rate limit or auth error is skipped
for a short while, so one bad key doesn't add latency to every request.
"""

import logging
import threading
import time

import httpx

import config

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
REQUEST_TIMEOUT_SECONDS = 20

# Failures worth retrying on the next key. 400/422 mean the request itself is
# bad, so another key would fail the same way.
_RETRYABLE_STATUS = {401, 403, 429, 500, 502, 503, 504}
_RATE_LIMIT_COOLDOWN_SECONDS = 60
_AUTH_FAILURE_COOLDOWN_SECONDS = 600

_key_cooldowns: dict[str, float] = {}
_cooldown_lock = threading.Lock()


def _key_label(key: str) -> str:
    # Never log a full key.
    return f"...{key[-4:]}" if len(key) >= 4 else "..."


def _keys_in_order() -> list[str]:
    """Configured keys, with keys still cooling down moved to the end (not
    dropped: if every key is cooling down, trying one is better than failing
    without a request)."""
    now = time.monotonic()
    with _cooldown_lock:
        ready = [k for k in config.GROQ_API_KEYS if _key_cooldowns.get(k, 0) <= now]
        cooling = [k for k in config.GROQ_API_KEYS if _key_cooldowns.get(k, 0) > now]
    return ready + cooling


def _cool_down(key: str, seconds: int) -> None:
    with _cooldown_lock:
        _key_cooldowns[key] = time.monotonic() + seconds


def call_groq(
    prompt: str,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> str | None:
    """Sends a single-turn prompt to Groq and returns the raw text reply, or
    None if no key is configured or every key fails. Callers are expected to
    fall back gracefully on None.
    """
    keys = _keys_in_order()
    if not keys:
        logger.warning("No Groq API key configured")
        return None

    body = {
        "model": config.GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
    }
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    for key in keys:
        try:
            response = httpx.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=body,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except httpx.HTTPError as e:
            logger.warning("Groq request failed with key %s: %s", _key_label(key), e)
            continue

        if response.status_code == 200:
            try:
                return response.json()["choices"][0]["message"]["content"].strip()
            except (KeyError, IndexError, ValueError):
                logger.warning("Unexpected Groq response shape")
                return None

        logger.warning("Groq returned %s with key %s", response.status_code, _key_label(key))
        if response.status_code == 429:
            _cool_down(key, _RATE_LIMIT_COOLDOWN_SECONDS)
        elif response.status_code in (401, 403):
            _cool_down(key, _AUTH_FAILURE_COOLDOWN_SECONDS)

        if response.status_code not in _RETRYABLE_STATUS:
            return None

    logger.error("All Groq keys failed")
    return None
