import logging

import httpx
from fastapi import APIRouter, Depends, Request
from gotrue.errors import AuthRetryableError
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

import config
import database
from deps import derive_username, get_client_ip, get_current_user
from models.auth import AuthResponse, AuthUser, GoogleAuthUrl, LoginRequest, RefreshRequest, RegisterRequest
from services.rate_limit import (
    login_identifier_limiter,
    login_ip_limiter,
    refresh_ip_limiter,
    register_ip_limiter,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# One message for every login failure (unknown user ID, unknown email, wrong
# password) so the login form can't be used to discover which accounts exist.
INVALID_CREDENTIALS = "Incorrect email / user ID or password."
GENERIC_AUTH_ERROR = "Something went wrong. Please try again."
TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a few minutes and try again."
USERNAME_TAKEN = "This User ID is already taken. Choose another."
SERVICE_UNAVAILABLE = "Can't reach the server right now. Please try again in a moment."

# Supabase auth error texts that are safe and useful to show, mapped to our
# own wording. Anything not listed becomes GENERIC_AUTH_ERROR, so internal
# error details never reach the browser.
_KNOWN_AUTH_ERRORS = {
    "invalid login credentials": INVALID_CREDENTIALS,
    "email not confirmed": "Please confirm your email address first. Check your inbox.",
    "user already registered": "An account with this email already exists. Try logging in.",
    "password should be at least": "Password is too short.",
    "invalid refresh token": "Your session has expired. Please log in again.",
    "refresh token not found": "Your session has expired. Please log in again.",
    "refresh token is not valid": "Your session has expired. Please log in again.",
    "email rate limit exceeded": TOO_MANY_ATTEMPTS,
    "rate limit": TOO_MANY_ATTEMPTS,
}


def _friendly_auth_error(e: Exception) -> str:
    text = str(e).lower()
    for needle, message in _KNOWN_AUTH_ERRORS.items():
        if needle in text:
            return message
    logger.warning("Unmapped Supabase auth error: %s", e)
    return GENERIC_AUTH_ERROR


def _error_response(message: str, status_code: int) -> JSONResponse:
    # Same body shape as a normal AuthResponse, so the frontend's existing
    # `result.error` handling shows the message whatever the status code.
    return JSONResponse(status_code=status_code, content=AuthResponse(error=message).model_dump())


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
def login(body: LoginRequest, request: Request):
    ip = get_client_ip(request)
    if not login_ip_limiter.allow(ip) or not login_identifier_limiter.allow(body.identifier.lower()):
        return _error_response(TOO_MANY_ATTEMPTS, 429)

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
            return AuthResponse(error=INVALID_CREDENTIALS)
        email = result.data[0]["email"]

    try:
        auth_result = database.auth_client.auth.sign_in_with_password({"email": email, "password": body.password})
    except (httpx.TransportError, AuthRetryableError):
        return _error_response(SERVICE_UNAVAILABLE, 503)
    except Exception as e:
        return AuthResponse(error=_friendly_auth_error(e))

    user = auth_result.user
    return _session_to_response(auth_result.session, user.user_metadata or {}, user.email, user.created_at)


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, request: Request):
    if not register_ip_limiter.allow(get_client_ip(request)):
        return _error_response(TOO_MANY_ATTEMPTS, 429)

    # Check if the username is already taken.
    existing = (
        database.db_client.table("profiles")
        .select("id")
        .eq("username", body.username)
        .limit(1)
        .execute()
    )
    if existing.data:
        return AuthResponse(error=USERNAME_TAKEN)

    try:
        signup_result = database.auth_client.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"username": body.username}},
            }
        )
    except Exception as e:
        return AuthResponse(error=_friendly_auth_error(e))

    if signup_result.user:
        try:
            database.db_client.table("profiles").insert(
                {
                    "id": signup_result.user.id,
                    "username": body.username,
                    "email": body.email,
                }
            ).execute()
        except APIError as e:
            # Most likely someone registered the same username between the
            # check above and now (profiles.username is UNIQUE). Remove the
            # auth account just created so it isn't left without a profile.
            logger.warning("Profile insert failed for new user: %s", e)
            try:
                database.db_client.auth.admin.delete_user(signup_result.user.id)
            except Exception:
                logger.exception("Could not roll back auth user %s", signup_result.user.id)
            if getattr(e, "code", None) == "23505":
                return AuthResponse(error=USERNAME_TAKEN)
            return AuthResponse(error=GENERIC_AUTH_ERROR)

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
def refresh(body: RefreshRequest, request: Request):
    if not refresh_ip_limiter.allow(get_client_ip(request)):
        return _error_response(TOO_MANY_ATTEMPTS, 429)

    try:
        result = database.auth_client.auth.refresh_session(body.refresh_token)
    except (httpx.TransportError, AuthRetryableError):
        # Temporary: the frontend keeps the session on 5xx and retries later.
        return _error_response(SERVICE_UNAVAILABLE, 503)
    except Exception as e:
        return AuthResponse(error=_friendly_auth_error(e))
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
