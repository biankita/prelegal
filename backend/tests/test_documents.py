from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app_factory(monkeypatch):
    """Yield a callable that returns a signed-in `TestClient` for an arbitrary
    user. Each call uses a context-manager-wrapped client so FastAPI's
    `lifespan` (which resets the DB schema) fires, and so multiple users in a
    single test get isolated cookie jars."""
    db_path = os.path.join(tempfile.mkdtemp(), "prelegal-test.db")
    monkeypatch.setenv("PRELEGAL_DB_PATH", db_path)
    monkeypatch.setenv("PRELEGAL_JWT_SECRET", "test-secret-do-not-use-in-prod")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    import importlib

    import app.config as config

    importlib.reload(config)
    import app.db as db

    importlib.reload(db)
    import app.security as security

    importlib.reload(security)
    import app.deps as deps

    importlib.reload(deps)
    import app.llm as llm

    importlib.reload(llm)
    import app.routers.auth as auth_router
    import app.routers.chat as chat_router
    import app.routers.documents as documents_router
    import app.routers.health as health_router

    importlib.reload(auth_router)
    importlib.reload(chat_router)
    importlib.reload(documents_router)
    importlib.reload(health_router)
    import app.main as main

    importlib.reload(main)

    # Lifespan (which resets the DB schema) must fire exactly once per test.
    # We enter one anchor TestClient as a context manager so the schema is
    # initialized, then create per-user clients without re-entering — each
    # gets its own cookie jar but shares the running app and DB.
    with TestClient(main.app) as _anchor:
        def _make_signed_in(
            email: str, password: str = "testpassword123"
        ) -> TestClient:
            c = TestClient(main.app)
            r = c.post(
                "/api/auth/signup", json={"email": email, "password": password}
            )
            assert r.status_code == 201, r.text
            return c

        def _make_anonymous() -> TestClient:
            return TestClient(main.app)

        yield _make_signed_in, _make_anonymous


def test_documents_require_auth(app_factory):
    _signed_in, anon = app_factory
    c = anon()
    assert c.get("/api/documents").status_code == 401
    assert c.post("/api/documents", json={}).status_code == 401
    assert c.get("/api/documents/1").status_code == 401
    assert c.put("/api/documents/1", json={}).status_code == 401
    assert c.delete("/api/documents/1").status_code == 401


def test_create_list_get_document(app_factory):
    signed_in, _anon = app_factory
    c = signed_in("alice@example.com")

    # Empty list when nothing saved.
    r = c.get("/api/documents")
    assert r.status_code == 200
    assert r.json() == []

    # Create with NDA values.
    payload = {
        "documentType": "mutual_nda",
        "ndaValues": {
            "purpose": "evaluating a partnership",
            "effectiveDate": "2026-05-10",
            "mndaTerm": {"type": "expires", "years": 1},
            "confidentialityTerm": {"type": "years", "years": 1},
            "governingLaw": "Delaware",
            "jurisdiction": "Wilmington, DE",
            "party1": {
                "company": "Acme",
                "signatory": "Alice",
                "title": "CEO",
                "noticeAddress": "alice@acme.example",
            },
            "party2": {
                "company": "",
                "signatory": "",
                "title": "",
                "noticeAddress": "",
            },
            "modifications": "",
        },
        "messages": [
            {"role": "user", "content": "I need an NDA"},
            {"role": "assistant", "content": "Sure — who are the parties?"},
        ],
        "isComplete": False,
    }
    r = c.post("/api/documents", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    new_id = body["id"]
    assert body["documentType"] == "mutual_nda"
    assert body["displayName"] == "Mutual NDA"
    assert body["ndaValues"]["party1"]["company"] == "Acme"
    assert body["isComplete"] is False
    assert len(body["messages"]) == 2

    # List shows the new doc.
    r = c.get("/api/documents")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["id"] == new_id
    assert rows[0]["displayName"] == "Mutual NDA"

    # Get individual doc.
    r = c.get(f"/api/documents/{new_id}")
    assert r.status_code == 200
    assert r.json()["id"] == new_id


def test_update_document_persists_state(app_factory):
    signed_in, _anon = app_factory
    c = signed_in("alice@example.com")
    created = c.post(
        "/api/documents",
        json={"documentType": "csa"},
    ).json()
    doc_id = created["id"]

    # Update with generic values + completion flag.
    update = {
        "documentType": "csa",
        "genericValues": {
            "common": {
                "purpose": "buying cloud",
                "effectiveDate": "2026-05-10",
                "governingLaw": "Delaware",
                "jurisdiction": "Wilmington, DE",
                "party1": {
                    "company": "Buyer",
                    "signatory": "B",
                    "title": "CEO",
                    "noticeAddress": "b@buyer.example",
                },
                "party2": {
                    "company": "Seller",
                    "signatory": "S",
                    "title": "CEO",
                    "noticeAddress": "s@seller.example",
                },
            },
            "extras": {
                "subscriptionPeriod": "12 months",
                "fees": "$10k/year",
                "paymentProcess": "Net 30",
                "generalCapAmount": "$100k",
            },
        },
        "isComplete": True,
    }
    r = c.put(f"/api/documents/{doc_id}", json=update)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["genericValues"]["extras"]["fees"] == "$10k/year"
    assert body["isComplete"] is True
    assert body["updatedAt"] >= body["createdAt"]


def test_delete_document(app_factory):
    signed_in, _anon = app_factory
    c = signed_in("alice@example.com")
    created = c.post("/api/documents", json={"documentType": "pilot"}).json()
    doc_id = created["id"]

    r = c.delete(f"/api/documents/{doc_id}")
    assert r.status_code == 204
    # 404 the second time.
    r = c.delete(f"/api/documents/{doc_id}")
    assert r.status_code == 404


def test_users_cannot_access_others_documents(app_factory):
    signed_in, _anon = app_factory
    alice = signed_in("alice@example.com")
    bob = signed_in("bob@example.com")

    a_doc = alice.post("/api/documents", json={"documentType": "mutual_nda"}).json()

    # Bob's list should be empty (no cross-user leakage).
    assert bob.get("/api/documents").json() == []

    # Bob can't read, update, or delete Alice's doc.
    assert bob.get(f"/api/documents/{a_doc['id']}").status_code == 404
    assert bob.put(f"/api/documents/{a_doc['id']}", json={}).status_code == 404
    assert bob.delete(f"/api/documents/{a_doc['id']}").status_code == 404

    # Alice still owns it.
    assert alice.get(f"/api/documents/{a_doc['id']}").status_code == 200


def test_create_rejects_unknown_document_type(app_factory):
    signed_in, _anon = app_factory
    c = signed_in("alice@example.com")
    r = c.post("/api/documents", json={"documentType": "not_a_real_doc"})
    assert r.status_code == 400


def test_documents_listed_in_recent_first_order(app_factory):
    signed_in, _anon = app_factory
    c = signed_in("alice@example.com")
    first = c.post("/api/documents", json={"documentType": "mutual_nda"}).json()
    second = c.post("/api/documents", json={"documentType": "csa"}).json()
    rows = c.get("/api/documents").json()
    assert [r["id"] for r in rows] == [second["id"], first["id"]]
