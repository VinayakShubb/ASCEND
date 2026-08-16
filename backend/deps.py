from fastapi import Header, HTTPException

import database


def get_current_user(authorization: str = Header(...)) -> dict:
    """FastAPI dependency: reads the Bearer token, asks Supabase who it belongs
    to, and returns a small dict describing the logged-in user. Raises 401 if
    the token is missing, malformed, or expired.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        result = database.auth_client.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not result or not result.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = result.user
    return {
        "id": user.id,
        "email": user.email,
        # supabase-py returns created_at as a datetime, but AuthUser expects a string.
        "created_at": user.created_at.isoformat() if hasattr(user.created_at, "isoformat") else user.created_at,
        "user_metadata": user.user_metadata or {},
    }


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
