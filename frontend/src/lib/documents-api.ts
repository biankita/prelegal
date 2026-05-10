// Per-user document persistence. Auto-saved by the page on every chat turn.

import type { GenericValues } from "@/lib/document-state";
import type { NdaFormValues } from "@/lib/nda-schema";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DocumentSummary = {
  id: number;
  documentType: string | null;
  displayName: string | null;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetail = {
  id: number;
  documentType: string | null;
  displayName: string | null;
  ndaValues: NdaFormValues;
  genericValues: GenericValues;
  messages: ChatMessage[];
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DocumentUpsert = {
  documentType: string | null;
  ndaValues: NdaFormValues;
  genericValues: GenericValues;
  messages: ChatMessage[];
  isComplete: boolean;
};

async function jsonOrThrow<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const detail = await r
      .json()
      .then((b: { detail?: string }) => b?.detail)
      .catch(() => null);
    throw new Error(detail || `Request failed (${r.status})`);
  }
  return (await r.json()) as T;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const r = await fetch("/api/documents");
  return jsonOrThrow<DocumentSummary[]>(r);
}

export async function getDocument(id: number): Promise<DocumentDetail> {
  const r = await fetch(`/api/documents/${id}`);
  return jsonOrThrow<DocumentDetail>(r);
}

export async function createDocument(
  body: DocumentUpsert,
): Promise<DocumentDetail> {
  const r = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<DocumentDetail>(r);
}

export async function updateDocument(
  id: number,
  body: DocumentUpsert,
): Promise<DocumentDetail> {
  const r = await fetch(`/api/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<DocumentDetail>(r);
}

export async function deleteDocument(id: number): Promise<void> {
  const r = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!r.ok && r.status !== 204) {
    throw new Error(`Failed to delete (${r.status})`);
  }
}
