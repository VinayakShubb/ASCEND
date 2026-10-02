from typing import Optional

from pydantic import BaseModel, Field, field_validator

USERNAME_PATTERN = r"^[A-Za-z0-9_.-]+$"
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterRequest(BaseModel):
    email: str = Field(max_length=254, pattern=EMAIL_PATTERN)
    password: str = Field(min_length=8, max_length=128)
    username: str = Field(min_length=3, max_length=24, pattern=USERNAME_PATTERN)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginRequest(BaseModel):
    # No minimum password length here: accounts created before the 8-character
    # rule must still be able to log in.
    identifier: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("identifier")
    @classmethod
    def strip_identifier(cls, value: str) -> str:
        return value.strip()


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=4096)


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
