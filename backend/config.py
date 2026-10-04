import os
import re
from dotenv import load_dotenv

load_dotenv()


def _split_list(raw: str) -> list[str]:
    # Commas, spaces and newlines all separate items, so a list pasted into a
    # dashboard across several lines still parses.
    return [item for item in re.split(r"[\s,]+", raw) if item]


SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Groq keys, tried in order: the first one is the main key, the rest are only
# used when the one before it fails (rate limit, revoked key, Groq outage).
# Both GROQ_API_KEYS and the older GROQ_API_KEY accept one key or a
# comma-separated list; keys from GROQ_API_KEYS come first.
GROQ_API_KEYS: list[str] = list(
    dict.fromkeys(
        _split_list(os.environ.get("GROQ_API_KEYS", "")) + _split_list(os.environ.get("GROQ_API_KEY", ""))
    )
)

# llama-3.1-8b-instant was shut down for non-Enterprise accounts on
# 2026-08-16; Groq's recommended replacement is openai/gpt-oss-20b.
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")

# Where Google OAuth should send the browser back to after login.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

# The Capacitor Android/iOS app serves its web layer from a localhost origin,
# so the API has to allow it the same way it allows the website.
NATIVE_APP_ORIGINS = ["https://localhost", "http://localhost", "capacitor://localhost"]

# Every origin allowed to call the API from a browser: FRONTEND_URL plus any
# extras (custom domain, a second Vercel domain) in FRONTEND_URLS, plus the
# native app.
ALLOWED_ORIGINS: list[str] = list(
    dict.fromkeys([FRONTEND_URL, *_split_list(os.environ.get("FRONTEND_URLS", "")), *NATIVE_APP_ORIGINS])
)

# Optional: crash/error reporting. Leave unset locally and in tests.
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

# Per-user AI generation limits, per local calendar day.
AI_BRIEF_DAILY_LIMIT = int(os.environ.get("AI_BRIEF_DAILY_LIMIT", "1"))
AI_COACH_DAILY_LIMIT = int(os.environ.get("AI_COACH_DAILY_LIMIT", "8"))
AI_CIPHER_DAILY_LIMIT = int(os.environ.get("AI_CIPHER_DAILY_LIMIT", "20"))
# Minimum gap between two CIPHER generations for the same user. Requests
# inside the gap get the previous analysis back instead of a new Groq call.
AI_CIPHER_COOLDOWN_SECONDS = int(os.environ.get("AI_CIPHER_COOLDOWN_SECONDS", "10"))
