"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthScreen } from "@/components/auth-screen";
import { DocumentChat } from "@/components/document-chat";
import { DocumentHistory } from "@/components/document-history";
import { GenericDownloadButton } from "@/components/generic-download-button";
import { GenericPreview } from "@/components/generic-preview";
import { NdaDownloadButton } from "@/components/nda-download-button";
import { NdaForm } from "@/components/nda-form";
import { NdaPreview } from "@/components/nda-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { fetchMe, type AuthUser } from "@/lib/auth";
import {
  emptyGenericValues,
  isGenericComplete,
  type GenericValues,
} from "@/lib/document-state";
import {
  fetchDocumentRegistry,
  MUTUAL_NDA_SLUG,
  type DocumentSpec,
} from "@/lib/documents";
import {
  createDocument,
  getDocument,
  updateDocument,
  type ChatMessage,
} from "@/lib/documents-api";
import { ndaDefaults, ndaSchema, type NdaFormValues } from "@/lib/nda-schema";

export default function Home() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [registry, setRegistry] = useState<DocumentSpec[] | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [ndaValues, setNdaValues] = useState<NdaFormValues>(ndaDefaults);
  const [genericValues, setGenericValues] = useState<GenericValues>(
    emptyGenericValues,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Resolve session on mount.
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load doc registry once we have a session.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchDocumentRegistry()
      .then((docs) => {
        if (!cancelled) setRegistry(docs);
      })
      .catch(() => {
        if (!cancelled) setRegistry([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleNdaChange = useCallback(
    (next: NdaFormValues) => setNdaValues(next),
    [],
  );

  const handleChatState = useCallback(
    (next: {
      documentType: string | null;
      ndaValues: NdaFormValues;
      genericValues: GenericValues;
    }) => {
      setDocumentType(next.documentType);
      setNdaValues(next.ndaValues);
      setGenericValues(next.genericValues);
    },
    [],
  );

  const activeSpec =
    documentType && registry
      ? registry.find((d) => d.slug === documentType) ?? null
      : null;
  const isNda = documentType === MUTUAL_NDA_SLUG;

  const isComplete = useMemo(() => {
    if (isNda) return ndaSchema.safeParse(ndaValues).success;
    if (activeSpec) return isGenericComplete(genericValues, activeSpec);
    return false;
  }, [isNda, ndaValues, activeSpec, genericValues]);

  // Auto-save: persist the current draft after every user-driven change. We
  // gate on `messages.length > 0` so a fresh visit (just the AI greeting) does
  // NOT create a row — only conversations with real content. The latest state
  // is held in a ref so the effect closure doesn't capture stale values.
  // `savingRef` prevents two concurrent POSTs from racing to create a doc when
  // `activeDocumentId` is still null. `loadingRef` suppresses one round of
  // autosave right after a saved doc is restored from the history drawer.
  const stateRef = useRef({
    activeDocumentId,
    documentType,
    ndaValues,
    genericValues,
    messages,
    isComplete,
  });
  stateRef.current = {
    activeDocumentId,
    documentType,
    ndaValues,
    genericValues,
    messages,
    isComplete,
  };
  const savingRef = useRef(false);
  const loadingRef = useRef(false);

  const userPresent = !!user;
  useEffect(() => {
    if (!userPresent) return;
    if (loadingRef.current) {
      // We just hydrated state from a saved doc. Skip this autosave tick;
      // the next user-driven change will pick it up.
      loadingRef.current = false;
      return;
    }
    const userMessageCount = messages.filter((m) => m.role === "user").length;
    if (userMessageCount === 0) return;
    // If a create is in flight, skip — when it resolves, `activeDocumentId`
    // will be set, and a subsequent change will PUT instead of POSTing again.
    if (savingRef.current && !stateRef.current.activeDocumentId) return;

    let cancelled = false;
    const snapshot = {
      documentType: stateRef.current.documentType,
      ndaValues: stateRef.current.ndaValues,
      genericValues: stateRef.current.genericValues,
      messages: stateRef.current.messages,
      isComplete: stateRef.current.isComplete,
    };

    savingRef.current = true;
    const persist = stateRef.current.activeDocumentId
      ? updateDocument(stateRef.current.activeDocumentId, snapshot)
      : createDocument(snapshot);

    persist
      .then((doc) => {
        if (cancelled) return;
        if (!stateRef.current.activeDocumentId) {
          setActiveDocumentId(doc.id);
        }
        setHistoryVersion((v) => v + 1);
      })
      .catch(() => {
        // Silent — autosave failures shouldn't block the user. A retry
        // happens on the next turn anyway.
      })
      .finally(() => {
        savingRef.current = false;
      });

    return () => {
      cancelled = true;
    };
    // Trigger on every change to the conversation or extracted values.
  }, [messages, documentType, ndaValues, genericValues, isComplete, userPresent]);

  const handleSignedIn = useCallback((u: AuthUser) => {
    setUser(u);
  }, []);

  const resetDocument = useCallback(() => {
    setActiveDocumentId(null);
    setDocumentType(null);
    setNdaValues(ndaDefaults);
    setGenericValues(emptyGenericValues);
    setMessages([]);
  }, []);

  const handleSignedOut = useCallback(() => {
    setUser(null);
    resetDocument();
  }, [resetDocument]);

  const handleNewDocument = resetDocument;

  const handleOpenDocument = useCallback(async (id: number) => {
    try {
      const doc = await getDocument(id);
      loadingRef.current = true;
      setActiveDocumentId(doc.id);
      setDocumentType(doc.documentType);
      setNdaValues(doc.ndaValues);
      setGenericValues(doc.genericValues);
      setMessages(doc.messages);
    } catch {
      // Surface a tiny error if needed; for now just no-op.
    }
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background" aria-hidden>
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (user === null) {
    return <AuthScreen onSignedIn={handleSignedIn} />;
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-[#209dd7]/15 via-[#753991]/5 to-transparent"
      />
      <header className="border-b border-border/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#209dd7] to-[#753991] text-white shadow-md shadow-[#209dd7]/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#032147]">
                Prelegal
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeSpec
                  ? `Drafting: ${activeSpec.displayName}. Chat with the AI, then download the PDF.`
                  : "Tell the AI what kind of agreement you'd like to draft."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
            >
              History
            </Button>
            {isNda && <NdaDownloadButton values={ndaValues} />}
            {activeSpec && !isNda && (
              <GenericDownloadButton spec={activeSpec} values={genericValues} />
            )}
            <UserMenu user={user} onSignedOut={handleSignedOut} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section aria-label="Input" className="lg:sticky lg:top-6 lg:self-start">
          {(() => {
            const chat = (
              <DocumentChat
                documentType={documentType}
                isComplete={isComplete}
                ndaValues={ndaValues}
                genericValues={genericValues}
                messages={messages}
                onMessagesChange={setMessages}
                onState={handleChatState}
              />
            );
            if (!isNda) return chat;
            return (
              <Tabs defaultValue="chat">
                <TabsList>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="form">Form</TabsTrigger>
                </TabsList>
                <TabsContent value="chat">{chat}</TabsContent>
                <TabsContent value="form">
                  <NdaForm values={ndaValues} onChange={handleNdaChange} />
                </TabsContent>
              </Tabs>
            );
          })()}
        </section>
        <section aria-label="Preview">
          {isNda ? (
            <NdaPreview values={ndaValues} />
          ) : activeSpec ? (
            <GenericPreview spec={activeSpec} values={genericValues} />
          ) : (
            <PreviewPlaceholder />
          )}
        </section>
      </main>

      <DocumentHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeDocumentId={activeDocumentId}
        onOpenDocument={handleOpenDocument}
        onNewDocument={handleNewDocument}
        refreshKey={historyVersion}
      />
    </div>
  );
}

function PreviewPlaceholder() {
  return (
    <article className="space-y-3 rounded-2xl border border-dashed border-[#209dd7]/40 bg-white/50 p-12 text-sm text-muted-foreground">
      <h2 className="text-lg font-medium text-[#032147]">Preview</h2>
      <p>
        Once you tell the AI what kind of agreement you&apos;d like to draft, the
        document will appear here and update as you answer questions.
      </p>
    </article>
  );
}
