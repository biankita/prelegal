from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..deps import current_user
from ..documents import DOCUMENTS, MUTUAL_NDA, get_document, is_supported
from ..models import ChatMessage
from ..llm import (
    GREETING,
    GenericValues,
    LlmError,
    NdaValues,
    call_generic_llm,
    call_llm,
    detect_document_type,
    initial_greeting,
    is_complete,
    is_generic_complete,
    merge_extraction,
    merge_generic_extraction,
)


router = APIRouter(dependencies=[Depends(current_user)])


class ChatRequest(BaseModel):
    """Original NDA-only chat request. Kept for back-compat with the existing
    Mutual NDA-only client behavior (and existing tests)."""

    messages: list[ChatMessage] = Field(default_factory=list)
    values: NdaValues = Field(default_factory=NdaValues)


class ChatResponse(BaseModel):
    reply: str
    values: NdaValues
    isComplete: bool


class GreetingResponse(BaseModel):
    reply: str


# --- Multi-document chat (PREL-6) -------------------------------------------


class DocumentChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    documentType: str | None = None
    ndaValues: NdaValues = Field(default_factory=NdaValues)
    genericValues: GenericValues = Field(default_factory=GenericValues)


class DocumentChatResponse(BaseModel):
    reply: str
    documentType: str | None = None
    suggestedAlternative: str | None = None
    ndaValues: NdaValues
    genericValues: GenericValues
    isComplete: bool


@router.get("/greeting", response_model=GreetingResponse)
def greeting() -> GreetingResponse:
    """NDA-only greeting; preserved for the original /api/chat/greeting clients."""
    return GreetingResponse(reply=GREETING)


@router.get("/document-greeting", response_model=GreetingResponse)
def document_greeting() -> GreetingResponse:
    """Greeting shown before any document type is selected."""
    return GreetingResponse(reply=initial_greeting())


@router.post("/message", response_model=ChatResponse)
def message(request: ChatRequest) -> ChatResponse:
    """NDA-only chat endpoint. Unchanged behavior."""
    if not request.messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="messages must contain at least one user message",
        )
    try:
        result = call_llm(
            [m.model_dump() for m in request.messages], request.values
        )
    except LlmError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)
        ) from e

    next_values = merge_extraction(request.values, result.extracted)
    return ChatResponse(
        reply=result.reply,
        values=next_values,
        isComplete=is_complete(next_values),
    )


@router.post("/document-message", response_model=DocumentChatResponse)
def document_message(request: DocumentChatRequest) -> DocumentChatResponse:
    """Multi-document chat endpoint.

    - If documentType is unset, runs detection and (on success) returns the
      detected slug along with a starter reply. The client is then expected to
      send subsequent turns with documentType set.
    - If documentType is "mutual_nda", uses the existing dedicated NDA path.
    - Otherwise routes to the generic extraction path.
    """
    if not request.messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="messages must contain at least one user message",
        )
    msgs = [m.model_dump() for m in request.messages]

    try:
        if request.documentType is None:
            detection = detect_document_type(msgs)
            return DocumentChatResponse(
                reply=detection.reply,
                documentType=detection.documentType,
                suggestedAlternative=detection.suggestedAlternative,
                ndaValues=request.ndaValues,
                genericValues=request.genericValues,
                isComplete=False,
            )

        if not is_supported(request.documentType):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown documentType: {request.documentType}",
            )

        if request.documentType == MUTUAL_NDA:
            result = call_llm(msgs, request.ndaValues)
            next_nda = merge_extraction(request.ndaValues, result.extracted)
            return DocumentChatResponse(
                reply=result.reply,
                documentType=MUTUAL_NDA,
                suggestedAlternative=None,
                ndaValues=next_nda,
                genericValues=request.genericValues,
                isComplete=is_complete(next_nda),
            )

        spec = get_document(request.documentType)
        gen_result = call_generic_llm(msgs, request.documentType, request.genericValues)
        next_generic = merge_generic_extraction(
            request.genericValues, gen_result.extracted, spec
        )
        return DocumentChatResponse(
            reply=gen_result.reply,
            documentType=request.documentType,
            suggestedAlternative=None,
            ndaValues=request.ndaValues,
            genericValues=next_generic,
            isComplete=is_generic_complete(next_generic, spec),
        )
    except LlmError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)
        ) from e


@router.get("/documents")
def list_documents() -> dict[str, Any]:
    """List supported document types for the frontend registry."""
    return {
        "documents": [
            {
                "slug": slug,
                "displayName": spec.display_name,
                "catalogName": spec.catalog_name,
                "termsUrl": spec.terms_url,
                "termsVersion": spec.terms_version,
                "extraFields": [
                    {"name": f.name, "label": f.label, "prompt": f.prompt}
                    for f in spec.extra_fields
                ],
            }
            for slug, spec in DOCUMENTS.items()
        ]
    }
