from typing import Optional

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str


class LoginRequest(BaseModel):
    identifier: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthUser(BaseModel):
    username: str
    theme: str
    onboarding_completed: bool
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    error: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[int] = None
    user: Optional[AuthUser] = None


class GoogleAuthUrl(BaseModel):
    url: str
