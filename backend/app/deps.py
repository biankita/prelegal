"""Shared FastAPI dependencies."""
from __future__ import annotations

from typing import Annotated

from fastapi import Cookie, HTTPException, status
from pydantic import BaseModel, EmailStr

from .db import connect
from .security import decode_token


class CurrentUser(BaseModel):
    id: int
    email: EmailStr


def current_user(
    auth_token: Annotated[str | None, Cookie()] = None,
) -> CurrentUser:
    """Resolve the requesting user from the auth cookie, or raise 401.

    Use as `Depends(current_user)` on any endpoint that requires login.
    """
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    payload = decode_token(auth_token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    user_id = int(payload["sub"])
    with connect() as conn:
        row = conn.execute(
            "SELECT id, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user"
        )
    return CurrentUser(id=row["id"], email=row["email"])
