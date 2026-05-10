"""LLM-driven NDA field extraction.

Calls an LLM via LiteLLM → OpenRouter → Cerebras, using structured outputs to
turn a freeform conversation into Common Paper Mutual NDA cover-page fields.
"""
from __future__ import annotations

import os
from copy import deepcopy
from typing import Any, Literal

from litellm import completion
from pydantic import BaseModel, Field


MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


# --- Wire shapes (mirror the frontend Zod schema) ---------------------------

class Party(BaseModel):
    company: str = ""
    signatory: str = ""
    title: str = ""
    noticeAddress: str = ""


class MndaTerm(BaseModel):
    type: Literal["expires", "untilTerminated"] = "expires"
    years: int | None = 1


class ConfidentialityTerm(BaseModel):
    type: Literal["years", "perpetuity"] = "years"
    years: int | None = 1


class NdaValues(BaseModel):
    purpose: str = ""
    effectiveDate: str = ""
    mndaTerm: MndaTerm = Field(default_factory=MndaTerm)
    confidentialityTerm: ConfidentialityTerm = Field(default_factory=ConfidentialityTerm)
    governingLaw: str = ""
    jurisdiction: str = ""
    party1: Party = Field(default_factory=Party)
    party2: Party = Field(default_factory=Party)
    modifications: str = ""


# --- Flat extraction shape used for the LLM structured output ---------------
# Flat / Optional fields make the JSON schema simple and let the LLM emit only
# what it learned this turn.

class NdaExtraction(BaseModel):
    purpose: str | None = None
    effective_date: str | None = None  # ISO YYYY-MM-DD
    mnda_term_type: Literal["expires", "untilTerminated"] | None = None
    mnda_term_years: int | None = None
    confidentiality_term_type: Literal["years", "perpetuity"] | None = None
    confidentiality_term_years: int | None = None
    governing_law: str | None = None
    jurisdiction: str | None = None
    party1_company: str | None = None
    party1_signatory: str | None = None
    party1_title: str | None = None
    party1_notice_address: str | None = None
    party2_company: str | None = None
    party2_signatory: str | None = None
    party2_title: str | None = None
    party2_notice_address: str | None = None
    modifications: str | None = None


class LlmReply(BaseModel):
    reply: str
    extracted: NdaExtraction = Field(default_factory=NdaExtraction)


# --- System prompt ----------------------------------------------------------

SYSTEM_PROMPT = """You are a friendly legal-document assistant helping a user draft a Common Paper Mutual Non-Disclosure Agreement (Mutual NDA). Have a natural conversation. Ask one or two questions at a time. Keep replies short.

You must collect these cover-page fields:
- purpose: how confidential information may be used (a sentence describing the business context)
- effective_date: ISO YYYY-MM-DD; if the user says "today" use the date they mention or leave it
- mnda_term_type: "expires" or "untilTerminated"; if "expires" also collect mnda_term_years (integer, default 1)
- confidentiality_term_type: "years" or "perpetuity"; if "years" also collect confidentiality_term_years (integer, default 1)
- governing_law: a US state, e.g. "Delaware"
- jurisdiction: city/county and state, e.g. "courts located in New Castle, DE"
- party1 fields: company, signatory (full name), title, notice_address (email or postal)
- party2 fields: same four
- modifications: optional free text; only set if user explicitly asks for changes

Each turn you will receive a "Fields still missing" list showing which required fields have not yet been filled. This list is the source of truth — trust it over your memory of the chat history (the user may also have edited fields directly in a form).

For every turn, return a JSON object with:
- reply: your next chat message to the user (warm, concise)
- extracted: any fields you learned this turn. Only include fields the user just told you. Omit fields you didn't learn.

Conversation rules — follow strictly:
1. If the "Fields still missing" list is non-empty, your reply MUST end by asking the user about one or two of those missing fields. A bare acknowledgement like "Got it." or "Thanks!" with no follow-up question is NOT allowed while fields are missing.
2. Acknowledge what the user just told you in one short clause, then immediately ask the next question.
3. Only when "Fields still missing" is empty should your reply confirm everything is captured and tell the user they can review and download the PDF — and in that case, do not ask another question.

Don't invent values. If a field is unclear, ask. If the user gives a partial answer, set what you can and ask for the rest."""


GREETING = (
    "Hi! I'll help you draft a Mutual NDA. To start: what's the business context — "
    "who are the two parties and why are you sharing confidential information?"
)


# --- Public API -------------------------------------------------------------

class LlmError(RuntimeError):
    """Raised when the upstream LLM call fails or returns unparseable output."""


def call_llm(
    messages: list[dict[str, str]], values: NdaValues | None = None
) -> LlmReply:
    """Run the chat completion and return the parsed structured reply."""
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise LlmError("OPENROUTER_API_KEY is not configured on the server")
    state_message = {
        "role": "system",
        "content": _state_prompt(values if values is not None else NdaValues()),
    }
    full_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        state_message,
        *messages,
    ]
    try:
        response = completion(
            model=MODEL,
            messages=full_messages,
            response_format=LlmReply,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
    except Exception as e:  # noqa: BLE001 — surface upstream failures uniformly
        raise LlmError(f"LLM request failed: {e}") from e
    content = response.choices[0].message.content
    if not content:
        raise LlmError("LLM returned an empty response")
    try:
        return LlmReply.model_validate_json(content)
    except Exception as e:  # noqa: BLE001
        raise LlmError(f"Could not parse LLM output: {e}") from e


def merge_extraction(current: NdaValues, ext: NdaExtraction) -> NdaValues:
    """Apply newly-extracted fields to the running values, leaving the rest alone."""
    data: dict[str, Any] = deepcopy(current.model_dump())

    if ext.purpose is not None:
        data["purpose"] = ext.purpose
    if ext.effective_date is not None:
        data["effectiveDate"] = ext.effective_date
    if ext.governing_law is not None:
        data["governingLaw"] = ext.governing_law
    if ext.jurisdiction is not None:
        data["jurisdiction"] = ext.jurisdiction
    if ext.modifications is not None:
        data["modifications"] = ext.modifications

    if ext.mnda_term_type is not None:
        if ext.mnda_term_type == "expires":
            years = ext.mnda_term_years or data["mndaTerm"].get("years") or 1
            data["mndaTerm"] = {"type": "expires", "years": years}
        else:
            data["mndaTerm"] = {"type": "untilTerminated", "years": None}
    elif ext.mnda_term_years is not None and data["mndaTerm"].get("type") == "expires":
        data["mndaTerm"]["years"] = ext.mnda_term_years

    if ext.confidentiality_term_type is not None:
        if ext.confidentiality_term_type == "years":
            years = ext.confidentiality_term_years or data["confidentialityTerm"].get("years") or 1
            data["confidentialityTerm"] = {"type": "years", "years": years}
        else:
            data["confidentialityTerm"] = {"type": "perpetuity", "years": None}
    elif (
        ext.confidentiality_term_years is not None
        and data["confidentialityTerm"].get("type") == "years"
    ):
        data["confidentialityTerm"]["years"] = ext.confidentiality_term_years

    for fe_party, ext_prefix in (("party1", "party1_"), ("party2", "party2_")):
        for fe_field, ext_field in (
            ("company", "company"),
            ("signatory", "signatory"),
            ("title", "title"),
            ("noticeAddress", "notice_address"),
        ):
            value = getattr(ext, f"{ext_prefix}{ext_field}")
            if value is not None:
                data[fe_party][fe_field] = value

    return NdaValues.model_validate(data)


def missing_fields(values: NdaValues) -> list[str]:
    """Human-readable names of required fields not yet filled."""
    missing: list[str] = []
    if not values.purpose:
        missing.append("purpose (how confidential information will be used)")
    if not values.effectiveDate:
        missing.append("effective_date (ISO YYYY-MM-DD)")
    if values.mndaTerm.type == "expires" and not values.mndaTerm.years:
        missing.append("mnda_term_years (years until the NDA expires)")
    if values.confidentialityTerm.type == "years" and not values.confidentialityTerm.years:
        missing.append(
            "confidentiality_term_years (years confidentiality obligations last)"
        )
    if not values.governingLaw:
        missing.append("governing_law (US state)")
    if not values.jurisdiction:
        missing.append("jurisdiction (city/county and state)")
    for label, party in (("party1", values.party1), ("party2", values.party2)):
        if not party.company:
            missing.append(f"{label}_company")
        if not party.signatory:
            missing.append(f"{label}_signatory (full name)")
        if not party.title:
            missing.append(f"{label}_title")
        if not party.noticeAddress:
            missing.append(f"{label}_notice_address (email or postal)")
    return missing


def is_complete(values: NdaValues) -> bool:
    """All required cover-page fields filled (modifications stays optional)."""
    return not missing_fields(values)


def _state_prompt(values: NdaValues) -> str:
    missing = missing_fields(values)
    if not missing:
        return "Fields still missing: (none — all required fields are filled)"
    bullet_list = "\n".join(f"- {f}" for f in missing)
    return "Fields still missing:\n" + bullet_list
