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


def _stub_completion(monkeypatch, payload_dict: dict):
    """Replace litellm.completion with one that returns a fixed JSON payload."""
    payload = json.dumps(payload_dict)

    class _Msg:
        content = payload

    class _Choice:
        message = _Msg()

    class _Resp:
        choices = [_Choice()]

    captured: dict = {}

    def _capture(**kwargs):
        captured["messages"] = kwargs["messages"]
        return _Resp()

    import app.llm as llm_module

    monkeypatch.setattr(llm_module, "completion", _capture)
    return captured


def test_documents_endpoint_lists_all_supported(client):
    r = client.get("/api/chat/documents")
    assert r.status_code == 200
    body = r.json()
    slugs = [d["slug"] for d in body["documents"]]
    assert "mutual_nda" in slugs
    assert "csa" in slugs
    assert len(slugs) == 11


def test_document_message_detects_supported_type(client, monkeypatch):
    _stub_completion(
        monkeypatch,
        {
            "reply": "Great — for the Mutual NDA, who are the two parties?",
            "documentType": "mutual_nda",
            "suggestedAlternative": None,
        },
    )
    r = client.post(
        "/api/chat/document-message",
        json={
            "messages": [{"role": "user", "content": "I need an NDA"}],
            "documentType": None,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["documentType"] == "mutual_nda"
    assert body["suggestedAlternative"] is None
    assert body["isComplete"] is False


def test_document_message_unsupported_returns_alternative(client, monkeypatch):
    _stub_completion(
        monkeypatch,
        {
            "reply": "We don't generate employment contracts. The closest we offer is the Professional Services Agreement.",
            "documentType": "unsupported",
            "suggestedAlternative": "psa",
        },
    )
    r = client.post(
        "/api/chat/document-message",
        json={
            "messages": [{"role": "user", "content": "I need an employment contract"}],
            "documentType": None,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["documentType"] == "unsupported"
    assert body["suggestedAlternative"] == "psa"


def test_document_message_normalizes_unknown_slug(client, monkeypatch):
    """Detection LLM hallucinated an invalid slug — backend coerces to null."""
    _stub_completion(
        monkeypatch,
        {
            "reply": "Sorry, can you clarify what kind of agreement?",
            "documentType": "made_up_slug",
            "suggestedAlternative": None,
        },
    )
    r = client.post(
        "/api/chat/document-message",
        json={
            "messages": [{"role": "user", "content": "something legal"}],
            "documentType": None,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["documentType"] is None


def test_document_message_routes_nda_to_dedicated_path(client, monkeypatch):
    captured = _stub_completion(
        monkeypatch,
        {
            "reply": "Got it. What's the effective date?",
            "extracted": {"purpose": "evaluating a deal", "party1_company": "Acme"},
        },
    )
    r = client.post(
        "/api/chat/document-message",
        json={
            "messages": [{"role": "user", "content": "Acme is exploring a deal"}],
            "documentType": "mutual_nda",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["documentType"] == "mutual_nda"
    assert body["ndaValues"]["purpose"] == "evaluating a deal"
    assert body["ndaValues"]["party1"]["company"] == "Acme"
    # NDA system prompt should be in the messages.
    system_blob = "\n".join(
        m["content"] for m in captured["messages"] if m["role"] == "system"
    )
    assert "Mutual Non-Disclosure Agreement" in system_blob


def test_document_message_generic_path_extracts_extras(client, monkeypatch):
    captured = _stub_completion(
        monkeypatch,
        {
            "reply": "Got it. What's the subscription period?",
            "extracted": {
                "purpose": "purchasing the cloud service",
                "extras": {"fees": "$10,000/year"},
            },
        },
    )
    r = client.post(
        "/api/chat/document-message",
        json={
            "messages": [{"role": "user", "content": "We're buying ACME's cloud product."}],
            "documentType": "csa",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["documentType"] == "csa"
    assert body["genericValues"]["common"]["purpose"] == "purchasing the cloud service"
    assert body["genericValues"]["extras"]["fees"] == "$10,000/year"
    # Generic system prompt should mention the doc type display name.
    system_blob = "\n".join(
        m["content"] for m in captured["messages"] if m["role"] == "system"
    )
    assert "Cloud Service Agreement" in system_blob
    # State prompt must list extras for the registered fields.
    assert "Fields still missing" in system_blob
    assert "extras.subscriptionPeriod" in system_blob


def test_document_message_drops_unregistered_extras(client, monkeypatch):
    """LLM returning an extras key not in the registry must be ignored."""
    _stub_completion(
        monkeypatch,
        {
            "reply": "ok",
            "extracted": {
                "extras": {"fees": "$5k", "totallyMadeUpKey": "ignore me"},
            },
        },
    )
    r = client.post(
        "/api/chat/document-message",
        json={
            "messages": [{"role": "user", "content": "details"}],
            "documentType": "csa",
        },
    )
    assert r.status_code == 200, r.text
    extras = r.json()["genericValues"]["extras"]
    assert extras == {"fees": "$5k"}


def test_document_message_generic_complete_when_all_filled(client, monkeypatch):
    _stub_completion(
        monkeypatch,
        {
            "reply": "All set.",
            "extracted": {},
        },
    )
    party = {
        "company": "X",
        "signatory": "Y",
        "title": "Z",
        "noticeAddress": "y@x.example",
    }
    full_generic = {
        "common": {
            "purpose": "p",
            "effectiveDate": "2026-01-01",
            "governingLaw": "Delaware",
            "jurisdiction": "Wilmington, DE",
            "party1": party,
            "party2": party,
        },
        "extras": {
            "pilotPeriod": "60 days",
            "evaluationPurposes": "assessing fit",
            "generalCapAmount": "$100k",
        },
    }
    r = client.post(
        "/api/chat/document-message",
        json={
            "messages": [{"role": "user", "content": "anything else?"}],
            "documentType": "pilot",
            "genericValues": full_generic,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["isComplete"] is True


def test_document_message_rejects_unknown_doc_type(client):
    r = client.post(
        "/api/chat/document-message",
        json={
            "messages": [{"role": "user", "content": "hi"}],
            "documentType": "not_a_real_doc",
        },
    )
    assert r.status_code == 400


def test_document_greeting_lists_supported_docs(client):
    r = client.get("/api/chat/document-greeting")
    assert r.status_code == 200
    reply = r.json()["reply"]
    assert "Mutual NDA" in reply


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
