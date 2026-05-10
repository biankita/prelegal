from __future__ import annotations

import json
import os
import tempfile

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
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
    import app.llm as llm

    importlib.reload(llm)
    import app.routers.auth as auth_router
    import app.routers.chat as chat_router
    import app.routers.health as health_router

    importlib.reload(auth_router)
    importlib.reload(chat_router)
    importlib.reload(health_router)
    import app.main as main

    importlib.reload(main)

    with TestClient(main.app) as c:
        yield c


def _stub_llm(monkeypatch, *, reply: str, extracted: dict):
    """Replace litellm.completion with a function that returns a canned response."""
    payload = json.dumps({"reply": reply, "extracted": extracted})

    class _Msg:
        content = payload

    class _Choice:
        message = _Msg()

    class _Resp:
        choices = [_Choice()]

    import app.llm as llm_module

    monkeypatch.setattr(llm_module, "completion", lambda **_kwargs: _Resp())


def test_greeting(client):
    r = client.get("/api/chat/greeting")
    assert r.status_code == 200
    body = r.json()
    assert "reply" in body and isinstance(body["reply"], str) and body["reply"]


def test_message_extracts_and_merges(client, monkeypatch):
    _stub_llm(
        monkeypatch,
        reply="Got it. Who's the second party?",
        extracted={
            "purpose": "evaluating a partnership",
            "governing_law": "Delaware",
            "party1_company": "Acme Inc.",
        },
    )

    r = client.post(
        "/api/chat/message",
        json={
            "messages": [{"role": "user", "content": "Acme is partnering with someone."}],
            "values": {},
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reply"].startswith("Got it.")
    assert body["values"]["purpose"] == "evaluating a partnership"
    assert body["values"]["governingLaw"] == "Delaware"
    assert body["values"]["party1"]["company"] == "Acme Inc."
    # Untouched fields stay at defaults.
    assert body["values"]["party2"]["company"] == ""
    assert body["isComplete"] is False


def test_message_marks_complete_when_all_fields_filled(client, monkeypatch):
    _stub_llm(
        monkeypatch,
        reply="All set.",
        extracted={
            "party2_company": "Beta LLC",
            "party2_signatory": "Jane Doe",
            "party2_title": "CEO",
            "party2_notice_address": "jane@beta.example",
        },
    )

    full_values = {
        "purpose": "x",
        "effectiveDate": "2026-01-01",
        "mndaTerm": {"type": "expires", "years": 1},
        "confidentialityTerm": {"type": "years", "years": 2},
        "governingLaw": "Delaware",
        "jurisdiction": "Wilmington, DE",
        "party1": {
            "company": "Acme",
            "signatory": "Alice",
            "title": "CTO",
            "noticeAddress": "alice@acme.example",
        },
        "party2": {"company": "", "signatory": "", "title": "", "noticeAddress": ""},
        "modifications": "",
    }
    r = client.post(
        "/api/chat/message",
        json={"messages": [{"role": "user", "content": "Beta LLC, Jane Doe, CEO, jane@beta.example"}], "values": full_values},
    )
    assert r.status_code == 200, r.text
    assert r.json()["isComplete"] is True


def test_message_term_type_switch(client, monkeypatch):
    _stub_llm(
        monkeypatch,
        reply="Switched to perpetual.",
        extracted={"confidentiality_term_type": "perpetuity"},
    )
    r = client.post(
        "/api/chat/message",
        json={
            "messages": [{"role": "user", "content": "make confidentiality perpetual"}],
            "values": {"confidentialityTerm": {"type": "years", "years": 3}},
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["values"]["confidentialityTerm"]["type"] == "perpetuity"


def test_message_passes_missing_fields_to_llm(client, monkeypatch):
    """Regression: the LLM must see which required fields are still empty so it
    keeps asking instead of stopping at "Got it." (bug: incomplete_conversation).
    """
    captured: dict = {}

    payload = json.dumps({"reply": "Next question?", "extracted": {}})

    class _Msg:
        content = payload

    class _Choice:
        message = _Msg()

    class _Resp:
        choices = [_Choice()]

    def _capture(**kwargs):
        captured["messages"] = kwargs["messages"]
        return _Resp()

    import app.llm as llm_module

    monkeypatch.setattr(llm_module, "completion", _capture)

    partial_values = {
        "purpose": "evaluating a deal",
        "effectiveDate": "2026-05-11",
        "mndaTerm": {"type": "expires", "years": 5},
        "confidentialityTerm": {"type": "years", "years": 1},
        "governingLaw": "",
        "jurisdiction": "",
        "party1": {"company": "", "signatory": "", "title": "", "noticeAddress": ""},
        "party2": {"company": "", "signatory": "", "title": "", "noticeAddress": ""},
        "modifications": "",
    }
    r = client.post(
        "/api/chat/message",
        json={"messages": [{"role": "user", "content": "In 5 years"}], "values": partial_values},
    )
    assert r.status_code == 200, r.text

    system_messages = [m["content"] for m in captured["messages"] if m["role"] == "system"]
    state_blob = "\n".join(system_messages)
    assert "Fields still missing" in state_blob
    assert "governing_law" in state_blob
    assert "jurisdiction" in state_blob
    assert "party1_company" in state_blob
    assert "party2_company" in state_blob
    # Filled fields must NOT be listed as missing.
    assert "purpose " not in state_blob.split("Fields still missing:")[1]


def test_message_state_prompt_empty_when_complete(client, monkeypatch):
    captured: dict = {}

    payload = json.dumps({"reply": "All set.", "extracted": {}})

    class _Msg:
        content = payload

    class _Choice:
        message = _Msg()

    class _Resp:
        choices = [_Choice()]

    def _capture(**kwargs):
        captured["messages"] = kwargs["messages"]
        return _Resp()

    import app.llm as llm_module

    monkeypatch.setattr(llm_module, "completion", _capture)

    full_values = {
        "purpose": "x",
        "effectiveDate": "2026-01-01",
        "mndaTerm": {"type": "expires", "years": 1},
        "confidentialityTerm": {"type": "years", "years": 2},
        "governingLaw": "Delaware",
        "jurisdiction": "Wilmington, DE",
        "party1": {
            "company": "Acme",
            "signatory": "Alice",
            "title": "CTO",
            "noticeAddress": "alice@acme.example",
        },
        "party2": {
            "company": "Beta",
            "signatory": "Bob",
            "title": "CEO",
            "noticeAddress": "bob@beta.example",
        },
        "modifications": "",
    }
    r = client.post(
        "/api/chat/message",
        json={"messages": [{"role": "user", "content": "anything else?"}], "values": full_values},
    )
    assert r.status_code == 200, r.text
    state_blob = "\n".join(m["content"] for m in captured["messages"] if m["role"] == "system")
    assert "none — all required fields are filled" in state_blob


def test_message_rejects_empty_history(client):
    r = client.post("/api/chat/message", json={"messages": [], "values": {}})
    assert r.status_code == 400


def test_message_propagates_llm_failure(client, monkeypatch):
    import app.llm as llm_module

    def _boom(**_kwargs):
        raise RuntimeError("upstream timeout")

    monkeypatch.setattr(llm_module, "completion", _boom)

    r = client.post(
        "/api/chat/message",
        json={"messages": [{"role": "user", "content": "hi"}], "values": {}},
    )
    assert r.status_code == 502
