import os
import tempfile

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    db_path = os.path.join(tempfile.mkdtemp(), "prelegal-test.db")
    monkeypatch.setenv("PRELEGAL_DB_PATH", db_path)
    monkeypatch.setenv("PRELEGAL_JWT_SECRET", "test-secret-do-not-use-in-prod")

    # Ensure config is reloaded with the patched env, then import the app fresh.
    import importlib

    import app.config as config

    importlib.reload(config)
    import app.db as db

    importlib.reload(db)
    import app.security as security

    importlib.reload(security)
    import app.routers.auth as auth_router
    import app.routers.health as health_router

    importlib.reload(auth_router)
    importlib.reload(health_router)
    import app.main as main

    importlib.reload(main)

    with TestClient(main.app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_signup_signin_me_signout(client):
    creds = {"email": "alice@example.com", "password": "hunter2hunter2"}

    r = client.post("/api/auth/signup", json=creds)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "alice@example.com"
    assert "auth_token" in r.cookies

    # /me works while authenticated
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"

    # signout clears the cookie -> /me 401
    r = client.post("/api/auth/signout")
    assert r.status_code == 204
    r = client.get("/api/auth/me")
    assert r.status_code == 401

    # signin again succeeds with the same credentials
    r = client.post("/api/auth/signin", json=creds)
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"


def test_signup_duplicate_email(client):
    creds = {"email": "bob@example.com", "password": "correctbatterystaple"}
    assert client.post("/api/auth/signup", json=creds).status_code == 201
    r = client.post("/api/auth/signup", json=creds)
    assert r.status_code == 409


def test_signin_wrong_password(client):
    client.post(
        "/api/auth/signup",
        json={"email": "carol@example.com", "password": "rightpassword"},
    )
    r = client.post(
        "/api/auth/signin",
        json={"email": "carol@example.com", "password": "wrongpassword"},
    )
    assert r.status_code == 401


def test_password_min_length(client):
    r = client.post(
        "/api/auth/signup", json={"email": "dave@example.com", "password": "short"}
    )
    assert r.status_code == 422


def test_me_without_cookie(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401
