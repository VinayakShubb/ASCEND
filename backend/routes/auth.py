from fastapi import APIRouter, Depends

import config
import database
from deps import derive_username, get_current_user
from models.auth import AuthResponse, AuthUser, GoogleAuthUrl, LoginRequest, RefreshRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


def _session_to_response(session, user_metadata: dict, email: str | None, created_at) -> AuthResponse:
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_at=session.expires_at,
        user=AuthUser(
            username=derive_username(user_metadata, email),
            theme="obsidian",
            onboarding_completed=True,
            # supabase-py returns created_at as a datetime, but AuthUser expects a string.
            created_at=created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
        ),
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    email = body.identifier

    # If there's no '@', treat it as a username and look up the real email first.
    if "@" not in body.identifier:
        result = (
            database.db_client.table("profiles")
            .select("email")
            .eq("username", body.identifier)
            .limit(1)
            .execute()
        )
        if not result.data:
            return AuthResponse(error="User ID not found. Try your email instead.")
        email = result.data[0]["email"]

    try:
        auth_result = database.auth_client.auth.sign_in_with_password({"email": email, "password": body.password})
    except Exception as e:
        return AuthResponse(error=str(e))

    user = auth_result.user
    return _session_to_response(auth_result.session, user.user_metadata or {}, user.email, user.created_at)


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest):
    # Check if the username is already taken.
    existing = (
        database.db_client.table("profiles")
        .select("id")
        .eq("username", body.username)
        .limit(1)
        .execute()
    )
    if existing.data:
        return AuthResponse(error="This User ID is already taken. Choose another.")

    try:
        signup_result = database.auth_client.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"username": body.username}},
            }
        )
    except Exception as e:
        return AuthResponse(error=str(e))

    if signup_result.user:
        # Mirrors the original TS behavior exactly, including storing the
        # plaintext password alongside Supabase's own hashed auth record.
        database.db_client.table("profiles").insert(
            {
                "id": signup_result.user.id,
                "username": body.username,
                "email": body.email,
                "password_plain": body.password,
            }
        ).execute()

    if not signup_result.session:
        # Email confirmation required -- no session yet, but not an error.
        return AuthResponse(error=None)

    user = signup_result.user
    return _session_to_response(signup_result.session, user.user_metadata or {}, user.email, user.created_at)


@router.get("/google", response_model=GoogleAuthUrl)
def google_login_url():
    result = database.auth_client.auth.sign_in_with_oauth(
        {
            "provider": "google",
            "options": {"redirect_to": config.FRONTEND_URL},
        }
    )
    return GoogleAuthUrl(url=result.url)


@router.post("/refresh", response_model=AuthResponse)
def refresh(body: RefreshRequest):
    try:
        result = database.auth_client.auth.refresh_session(body.refresh_token)
    except Exception as e:
        return AuthResponse(error=str(e))

    user = result.user
    return _session_to_response(result.session, user.user_metadata or {}, user.email, user.created_at)


@router.get("/me", response_model=AuthUser)
def me(current_user: dict = Depends(get_current_user)):
    return AuthUser(
        username=derive_username(current_user["user_metadata"], current_user["email"]),
        theme="obsidian",
        onboarding_completed=True,
        created_at=current_user["created_at"],
    )
