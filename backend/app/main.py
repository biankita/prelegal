import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import reset_database
from .routers import auth, chat, health


@asynccontextmanager
async def lifespan(_: FastAPI):
    reset_database()
    yield


app = FastAPI(title="Prelegal API", lifespan=lifespan)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


# Serve the statically-exported Next.js frontend if it's available on disk.
# The Docker image places the export at /app/static; in local dev the env var
# PRELEGAL_STATIC_DIR can point at frontend/out.
_static_dir = settings.static_dir or "/app/static"
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="frontend")
