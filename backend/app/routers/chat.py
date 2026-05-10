from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ..llm import GREETING, LlmError, NdaValues, call_llm, is_complete, merge_extraction


router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    values: NdaValues = Field(default_factory=NdaValues)


class ChatResponse(BaseModel):
    reply: str
    values: NdaValues
    isComplete: bool


class GreetingResponse(BaseModel):
    reply: str


@router.get("/greeting", response_model=GreetingResponse)
def greeting() -> GreetingResponse:
    return GreetingResponse(reply=GREETING)


@router.post("/message", response_model=ChatResponse)
def message(request: ChatRequest) -> ChatResponse:
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
