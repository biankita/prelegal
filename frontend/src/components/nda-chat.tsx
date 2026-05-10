"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { NdaFormValues } from "@/lib/nda-schema";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  values: NdaFormValues;
  onChange: (next: NdaFormValues) => void;
};

export function NdaChat({ values, onChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Fetch the AI greeting once on mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat/greeting")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("greeting failed"))))
      .then((body: { reply: string }) => {
        if (!cancelled) setMessages([{ role: "assistant", content: body.reply }]);
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([
            {
              role: "assistant",
              content:
                "Hi! Tell me a bit about the agreement and the two parties, and I'll fill in the details for you.",
            },
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autoscroll on new messages.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setIsSending(true);
    setError(null);
    try {
      const r = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, values }),
      });
      if (!r.ok) {
        const detail = await r
          .json()
          .then((b) => (typeof b?.detail === "string" ? b.detail : null))
          .catch(() => null);
        throw new Error(detail || `Request failed (${r.status})`);
      }
      const body: {
        reply: string;
        values: NdaFormValues;
        isComplete: boolean;
      } = await r.json();
      onChange(body.values);
      setIsComplete(body.isComplete);
      setMessages((prev) => [...prev, { role: "assistant", content: body.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsSending(false);
    }
  }

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
