"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { GenericValues } from "@/lib/document-state";
import type { ChatMessage } from "@/lib/documents-api";
import type { NdaFormValues } from "@/lib/nda-schema";

type Props = {
  documentType: string | null;
  isComplete: boolean;
  ndaValues: NdaFormValues;
  genericValues: GenericValues;
  /** Controlled chat transcript — owned by the parent so it can be saved and
   * restored from a previously-saved document. */
  messages: ChatMessage[];
  onMessagesChange: (next: ChatMessage[]) => void;
  onState: (next: {
    documentType: string | null;
    ndaValues: NdaFormValues;
    genericValues: GenericValues;
  }) => void;
};

type DocumentResponse = {
  reply: string;
  documentType: string | null;
  suggestedAlternative: string | null;
  ndaValues: NdaFormValues;
  genericValues: GenericValues;
  isComplete: boolean;
};

export function DocumentChat({
  documentType,
  isComplete,
  ndaValues,
  genericValues,
  messages,
  onMessagesChange,
  onState,
}: Props) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Greeting only fires for a brand-new conversation. When the parent loads a
  // saved document it pushes the existing transcript in as `messages`, so we
  // must not overwrite it with a generic greeting.
  const messagesEmpty = messages.length === 0;
  useEffect(() => {
    if (!messagesEmpty) return;
    let cancelled = false;
    fetch("/api/chat/document-greeting")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("greeting failed"))))
      .then((body: { reply: string }) => {
        if (!cancelled) onMessagesChange([{ role: "assistant", content: body.reply }]);
      })
      .catch(() => {
        if (!cancelled) {
          onMessagesChange([
            {
              role: "assistant",
              content:
                "Hi! Tell me what kind of legal agreement you'd like to draft.",
            },
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
    // We deliberately depend on `messagesEmpty` (a derived boolean) and
    // `onMessagesChange` only — running once when the transcript empties out
    // (e.g. after the user clicks "Start a new document").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesEmpty]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    onMessagesChange(next);
    setInput("");
    setIsSending(true);
    setError(null);
    try {
      const r = await fetch("/api/chat/document-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          documentType,
          ndaValues,
          genericValues,
        }),
      });
      if (!r.ok) {
        const detail = await r
          .json()
          .then((b) => (typeof b?.detail === "string" ? b.detail : null))
          .catch(() => null);
        throw new Error(detail || `Request failed (${r.status})`);
      }
      const body: DocumentResponse = await r.json();
      const dt = body.documentType === "unsupported" ? null : body.documentType;
      onState({
        documentType: dt,
        ndaValues: body.ndaValues,
        genericValues: body.genericValues,
      });
      onMessagesChange([...next, { role: "assistant", content: body.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [input, isSending, messages, onMessagesChange, documentType, ndaValues, genericValues, onState]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Card className="flex h-[calc(100vh-12rem)] min-h-[520px] flex-col">
      <CardHeader>
        <CardTitle>Chat with the AI assistant</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
        <div
          ref={scrollerRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-3"
        >
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {isSending && <Bubble role="assistant" content="…" muted />}
          {isComplete && (
            <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700 ring-1 ring-emerald-200">
              All required fields look filled in — review the preview and download the PDF.
            </p>
          )}
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer… (Enter to send, Shift+Enter for newline)"
            className="resize-none"
            disabled={isSending}
          />
          <Button type="button" onClick={send} disabled={isSending || !input.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Bubble({
  role,
  content,
  muted,
}: {
  role: "user" | "assistant";
  content: string;
  muted?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          (isUser
            ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
            : "bg-white text-neutral-900 ring-1 ring-border/60") +
          " max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm shadow-sm" +
          (muted ? " opacity-60" : "")
        }
      >
        {content}
      </div>
    </div>
  );
}
