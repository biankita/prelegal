from __future__ import annotations

import os
import secrets
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    db_path: str
    jwt_secret: str
    jwt_algorithm: str
    jwt_expiry_seconds: int
    cookie_name: str
    cookie_secure: bool
    static_dir: str | None


def load_settings() -> Settings:
    return Settings(
        db_path=os.environ.get("PRELEGAL_DB_PATH", "/tmp/prelegal.db"),
        jwt_secret=os.environ.get("PRELEGAL_JWT_SECRET") or secrets.token_urlsafe(32),
        jwt_algorithm="HS256",
        jwt_expiry_seconds=int(os.environ.get("PRELEGAL_JWT_EXPIRY", 60 * 60 * 24 * 7)),
        cookie_name="auth_token",
        cookie_secure=os.environ.get("PRELEGAL_COOKIE_SECURE", "false").lower() == "true",
        static_dir=os.environ.get("PRELEGAL_STATIC_DIR"),
    )


settings = load_settings()
