"""Shared wire shapes used by more than one router."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
