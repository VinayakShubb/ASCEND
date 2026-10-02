import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config
import database
from models.auth import AuthResponse
from routes import ai, auth, habits, logs, stats

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ascend")

if config.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=config.SENTRY_DSN,
        environment=config.ENVIRONMENT,
        traces_sample_rate=0.1,
        # Never attach request bodies, cookies or headers: they carry
        # passwords and tokens.
        send_default_pii=False,
    )

app = FastAPI(title="ASCEND API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Timezone"],
)

# Readable messages for the login / signup forms, keyed by field name.
_AUTH_FIELD_MESSAGES = {
    "username": "User ID must be 3-24 characters: letters, numbers, dots, dashes or underscores.",
    "password": "Password must be at least 8 characters.",
    "email": "Enter a valid email address.",
    "identifier": "Enter your email or user ID.",
}


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """The auth forms read `error` from the response body, not FastAPI's
    default `detail` list, so give /auth/* a message they can show."""
    if request.url.path.startswith("/auth/"):
        message = "Please check the form and try again."
        for error in exc.errors():
            field = error.get("loc", [None])[-1]
            if field in _AUTH_FIELD_MESSAGES:
                message = _AUTH_FIELD_MESSAGES[field]
                break
        return JSONResponse(status_code=422, content=AuthResponse(error=message).model_dump())
    return await request_validation_exception_handler(request, exc)


app.include_router(auth.router)
app.include_router(habits.router)
app.include_router(logs.router)
app.include_router(stats.router)
app.include_router(ai.router)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/health")
def deep_health_check():
    """For uptime monitors: also confirms the database answers."""
    try:
        database.db_client.table("habits").select("id").limit(1).execute()
    except Exception:
        logger.exception("Health check: database unreachable")
        return JSONResponse(status_code=503, content={"status": "degraded", "database": "unreachable"})
    return {"status": "ok", "database": "ok"}
