import base64
import json
import os


def _fake_jwt(role: str) -> str:
    """supabase-py checks that the key it's given decodes as a JWT before it
    will even construct a client, so a plain string like "test-key" fails at
    import time. This builds a syntactically valid (but unsigned/fake) JWT
    good enough to satisfy that check -- nothing here ever gets sent to a
    real server, since routes tests swap in tests/fakes.FakeSupabaseClient.
    """

    def b64(data: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")

    header = b64({"alg": "HS256", "typ": "JWT"})
    payload = b64({"role": role, "iss": "test"})
    return f"{header}.{payload}.fake-signature"


# Dummy credentials so config.py / database.py don't blow up on import during
# tests. Tests never make real network calls to Supabase/Groq -- routes
# tests use a fake in-memory Supabase client (tests/fakes.py) and an empty
# GROQ_API_KEY just exercises the "AI unavailable" fallback paths.
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", _fake_jwt("anon"))
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", _fake_jwt("service_role"))
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")
