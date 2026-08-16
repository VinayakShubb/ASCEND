from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from routes import ai, auth, habits, logs, stats

app = FastAPI(title="ASCEND API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(habits.router)
app.include_router(logs.router)
app.include_router(stats.router)
app.include_router(ai.router)


@app.get("/")
def health_check():
    return {"status": "ok"}
