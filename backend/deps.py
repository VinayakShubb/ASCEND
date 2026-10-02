import hashlib
import threading
import time
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from fastapi import Header, HTTPException, Request
from gotrue.errors import AuthRetryableError

import database

# Verified tokens are remembered briefly so a page that fires five API calls
# at once asks Supabase "who is this?" once instead of five times. Kept short
# so a logged-out token stops working within a minute.
_TOKEN_CACHE_TTL_SECONDS = 60
_TOKEN_CACHE_MAX_ENTRIES = 2000
_token_cache: dict[str, tuple[float, dict]] = {}
_token_cache_lock = threading.Lock()


def _cache_get(token_hash: str) -> dict | None:
    with _token_cache_lock:
        entry = _token_cache.get(token_hash)
        if not entry:
            return None
        expires_at, user = entry
        if expires_at < time.monotonic():
            del _token_cache[token_hash]
            return None
        return user


def _cache_put(token_hash: str, user: dict) -> None:
    with _token_cache_lock:
        if len(_token_cache) >= _TOKEN_CACHE_MAX_ENTRIES:
            now = time.monotonic()
            for key in [k for k, (exp, _) in _token_cache.items() if exp < now]:
                del _token_cache[key]
            if len(_token_cache) >= _TOKEN_CACHE_MAX_ENTRIES:
                _token_cache.clear()
        _token_cache[token_hash] = (time.monotonic() + _TOKEN_CACHE_TTL_SECONDS, user)


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency: reads the Bearer token, asks Supabase who it belongs
    to, and returns a small dict describing the logged-in user. Raises 401 if
    the token is missing, malformed, or expired.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    cached = _cache_get(token_hash)
    if cached:
        return cached

    try:
        result = database.auth_client.auth.get_user(token)
    except (httpx.TransportError, AuthRetryableError):
        # Supabase unreachable: that says nothing about the token. A 401 here
        # would make the frontend drop a perfectly valid session.
        raise HTTPException(status_code=503, detail="Auth service temporarily unavailable")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not result or not result.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = result.user
    current_user = {
        "id": user.id,
        "email": user.email,
        # supabase-py returns created_at as a datetime, but AuthUser expects a string.
        "created_at": user.created_at.isoformat() if hasattr(user.created_at, "isoformat") else user.created_at,
        "user_metadata": user.user_metadata or {},
    }
    _cache_put(token_hash, current_user)
    return current_user


def get_user_today(x_timezone: str | None = Header(default=None)) -> date:
    """The user's current calendar date. The frontend sends its IANA timezone
    (e.g. "Asia/Kolkata") in X-Timezone; without it the server's UTC date
    would put Indian users on "yesterday" between midnight and 05:30.
    Falls back to UTC for missing or unknown timezones.
    """
    if x_timezone:
        try:
            return datetime.now(ZoneInfo(x_timezone)).date()
        except (ZoneInfoNotFoundError, ValueError):
            pass
    return datetime.now(timezone.utc).date()


def get_client_ip(request: Request) -> str:
    """Best-effort client IP for rate limiting. Render and Vercel put the real
    client address first in X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def derive_username(user_metadata: dict, email: str | None) -> str:
    """Same fallback chain AuthContext.tsx used client-side: username field,
    then Google's full_name, then the email prefix, then a hardcoded default.
    """
    if user_metadata.get("username"):
        return user_metadata["username"]
    if user_metadata.get("full_name"):
        return user_metadata["full_name"]
    if email:
        return email.split("@")[0]
    return "USER"
