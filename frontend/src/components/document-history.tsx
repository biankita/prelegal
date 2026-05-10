"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteDocument,
  listDocuments,
  type DocumentSummary,
} from "@/lib/documents-api";

type Props = {
  open: boolean;
  onClose: () => void;
  activeDocumentId: number | null;
  onOpenDocument: (id: number) => void;
  onNewDocument: () => void;
  /** Bumped externally to refetch the list (e.g. after auto-save). */
  refreshKey: number;
};

export function DocumentHistory({
  open,
  onClose,
  activeDocumentId,
  onOpenDocument,
  onNewDocument,
  refreshKey,
}: Props) {
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listDocuments()
      .then((rows) => {
        if (!cancelled) setDocs(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, refreshKey]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteDocument(id);
        setDocs((prev) => (prev ? prev.filter((d) => d.id !== id) : prev));
        // If the user just deleted the doc currently in view, start fresh.
        if (activeDocumentId === id) onNewDocument();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete");
      }
    },
    [activeDocumentId, onNewDocument],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border/60 bg-white shadow-xl"
        aria-label="Document history"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Your documents</h2>
            <p className="text-xs text-muted-foreground">
              Drafts auto-save as you chat.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {error && (
            <p className="m-4 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {docs === null && !error && (
            <p className="p-5 text-sm text-muted-foreground">Loading…</p>
          )}
          {docs && docs.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">
              No saved documents yet. Start a chat to create one.
            </p>
          )}
          {docs && docs.length > 0 && (
            <ul className="divide-y divide-border/60">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className={
                    "flex items-center gap-3 px-5 py-3 hover:bg-muted/40 " +
                    (activeDocumentId === d.id ? "bg-[#209dd7]/10" : "")
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDocument(d.id);
                      onClose();
                    }}
                    className="flex flex-1 flex-col items-start text-left"
                  >
                    <span className="text-sm font-medium">
                      {d.displayName ?? "Untitled draft"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(d.updatedAt)}
                      {d.isComplete ? " · Complete" : " · In progress"}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(d.id)}
                    aria-label={`Delete ${d.displayName ?? "draft"}`}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-border/60 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              onNewDocument();
              onClose();
            }}
          >
            Start a new document
          </Button>
        </footer>
      </aside>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
