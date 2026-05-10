// Frontend mirror of the backend document registry. The list is fetched at
// runtime from /api/chat/documents (so the backend stays the source of truth
// for fields), but we keep type definitions and a few helpers here.

export type ExtraFieldSpec = {
  name: string;
  label: string;
  prompt: string;
};

export type DocumentSpec = {
  slug: string;
  displayName: string;
  catalogName: string;
  termsUrl: string;
  termsVersion: string;
  extraFields: ExtraFieldSpec[];
};

export const MUTUAL_NDA_SLUG = "mutual_nda";

export async function fetchDocumentRegistry(): Promise<DocumentSpec[]> {
  const r = await fetch("/api/chat/documents");
  if (!r.ok) throw new Error(`Failed to load document registry (${r.status})`);
  const body: { documents: DocumentSpec[] } = await r.json();
  return body.documents;
}
