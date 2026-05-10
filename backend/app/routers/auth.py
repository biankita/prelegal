from __future__ import annotations

import sqlite3
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from pydantic import BaseModel, EmailStr, Field

from ..config import settings
from ..db import connect
from ..security import decode_token, hash_password, issue_token, verify_password


router = APIRouter()


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    id: int
    email: EmailStr


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.jwt_expiry_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _user_from_token(token: str | None) -> UserOut:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = int(payload["sub"])
    with connect() as conn:
        row = conn.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
    return UserOut(id=row["id"], email=row["email"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(credentials: Credentials, response: Response) -> UserOut:
    password_hash = hash_password(credentials.password)
    try:
        with connect() as conn:
            cursor = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (credentials.email.lower(), password_hash),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )
    assert user_id is not None
    _set_auth_cookie(response, issue_token(user_id))
    return UserOut(id=user_id, email=credentials.email.lower())


@router.post("/signin", response_model=UserOut)
def signin(credentials: Credentials, response: Response) -> UserOut:
    with connect() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?",
            (credentials.email.lower(),),
        ).fetchone()
    if row is None or not verify_password(credentials.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    _set_auth_cookie(response, issue_token(row["id"]))
    return UserOut(id=row["id"], email=row["email"])


@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT)
def signout(response: Response) -> Response:
    response.delete_cookie(settings.cookie_name, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
def me(auth_token: Annotated[str | None, Cookie()] = None) -> UserOut:
    return _user_from_token(auth_token)
