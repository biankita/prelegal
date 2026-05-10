"""User-scoped document persistence.

A document is the running state of a single chat-driven drafting session:
the detected document type, the extracted values (NDA-shaped or generic),
and the chat transcript. Auto-saved on each chat turn by the frontend.
"""
from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ValidationError

from ..db import connect
from ..deps import CurrentUser, current_user
from ..documents import DOCUMENTS, is_supported
from ..llm import GenericValues, NdaValues
from ..models import ChatMessage


router = APIRouter()


class DocumentSummary(BaseModel):
    """Lightweight row used in the history list."""

    id: int
    documentType: str | None
    displayName: str | None
    isComplete: bool
    createdAt: str
    updatedAt: str


class DocumentDetail(BaseModel):
    """Full payload used when a user opens a saved document."""

    id: int
    documentType: str | None
    displayName: str | None
    ndaValues: NdaValues
    genericValues: GenericValues
    messages: list[ChatMessage]
    isComplete: bool
    createdAt: str
    updatedAt: str


class DocumentUpsert(BaseModel):
    """Body shape for create/update. All fields optional so a brand-new draft
    can be created with just a documentType and grow from there."""

    documentType: str | None = None
    ndaValues: NdaValues = Field(default_factory=NdaValues)
    genericValues: GenericValues = Field(default_factory=GenericValues)
    messages: list[ChatMessage] = Field(default_factory=list)
    isComplete: bool = False


def _display_name(slug: str | None) -> str | None:
    if slug and slug in DOCUMENTS:
        return DOCUMENTS[slug].display_name
    return None


def _validate_doc_type(slug: str | None) -> None:
    if slug is not None and not is_supported(slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown documentType: {slug}",
        )


def _row_to_summary(row: Any) -> DocumentSummary:
    return DocumentSummary(
        id=row["id"],
        documentType=row["document_type"],
        displayName=_display_name(row["document_type"]),
        isComplete=bool(row["is_complete"]),
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


def _row_to_detail(row: Any) -> DocumentDetail:
    try:
        nda_values = NdaValues.model_validate_json(row["nda_values"])
        generic_values = GenericValues.model_validate_json(row["generic_values"])
        messages = [ChatMessage(**m) for m in json.loads(row["messages"])]
    except (ValidationError, json.JSONDecodeError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Stored document data is corrupted",
        ) from e
    return DocumentDetail(
        id=row["id"],
        documentType=row["document_type"],
        displayName=_display_name(row["document_type"]),
        ndaValues=nda_values,
        genericValues=generic_values,
        messages=messages,
        isComplete=bool(row["is_complete"]),
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


@router.get("", response_model=list[DocumentSummary])
def list_documents(
    user: Annotated[CurrentUser, Depends(current_user)],
) -> list[DocumentSummary]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, document_type, is_complete, created_at, updated_at "
            "FROM documents WHERE user_id = ? "
            "ORDER BY updated_at DESC, id DESC",
            (user.id,),
        ).fetchall()
    return [_row_to_summary(r) for r in rows]


@router.post("", response_model=DocumentDetail, status_code=status.HTTP_201_CREATED)
def create_document(
    body: DocumentUpsert,
    user: Annotated[CurrentUser, Depends(current_user)],
) -> DocumentDetail:
    _validate_doc_type(body.documentType)
    with connect() as conn:
        cursor = conn.execute(
            "INSERT INTO documents "
            "(user_id, document_type, nda_values, generic_values, messages, is_complete) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                user.id,
                body.documentType,
                body.ndaValues.model_dump_json(),
                body.genericValues.model_dump_json(),
                json.dumps([m.model_dump() for m in body.messages]),
                int(body.isComplete),
            ),
        )
        new_id = cursor.lastrowid
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ?", (new_id,)
        ).fetchone()
    assert row is not None
    return _row_to_detail(row)


@router.get("/{doc_id}", response_model=DocumentDetail)
def get_document(
    doc_id: int,
    user: Annotated[CurrentUser, Depends(current_user)],
) -> DocumentDetail:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (doc_id, user.id),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _row_to_detail(row)


@router.put("/{doc_id}", response_model=DocumentDetail)
def update_document(
    doc_id: int,
    body: DocumentUpsert,
    user: Annotated[CurrentUser, Depends(current_user)],
) -> DocumentDetail:
    _validate_doc_type(body.documentType)
    with connect() as conn:
        cursor = conn.execute(
            "UPDATE documents SET "
            "document_type = ?, nda_values = ?, generic_values = ?, "
            "messages = ?, is_complete = ?, updated_at = CURRENT_TIMESTAMP "
            "WHERE id = ? AND user_id = ?",
            (
                body.documentType,
                body.ndaValues.model_dump_json(),
                body.genericValues.model_dump_json(),
                json.dumps([m.model_dump() for m in body.messages]),
                int(body.isComplete),
                doc_id,
                user.id,
            ),
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Not found"
            )
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
    assert row is not None
    return _row_to_detail(row)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: int,
    user: Annotated[CurrentUser, Depends(current_user)],
) -> None:
    with connect() as conn:
        cursor = conn.execute(
            "DELETE FROM documents WHERE id = ? AND user_id = ?",
            (doc_id, user.id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Not found"
            )
