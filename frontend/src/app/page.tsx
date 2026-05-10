"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DocumentChat } from "@/components/document-chat";
import { GenericDownloadButton } from "@/components/generic-download-button";
import { GenericPreview } from "@/components/generic-preview";
import { NdaDownloadButton } from "@/components/nda-download-button";
import { NdaForm } from "@/components/nda-form";
import { NdaPreview } from "@/components/nda-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ndaDefaults, ndaSchema, type NdaFormValues } from "@/lib/nda-schema";

export default function Home() {
  const [registry, setRegistry] = useState<DocumentSpec[] | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [ndaValues, setNdaValues] = useState<NdaFormValues>(ndaDefaults);
  const [genericValues, setGenericValues] = useState<GenericValues>(
    emptyGenericValues,
  );

  useEffect(() => {
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
  }, []);

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

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-indigo-100/70 via-violet-50/40 to-transparent"
      />
      <header className="border-b border-border/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
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
              <h1 className="bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
                Legal document creator
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeSpec
                  ? `Drafting: ${activeSpec.displayName}. Chat with the AI, then download the PDF.`
                  : "Tell the AI what kind of agreement you'd like to draft."}
              </p>
            </div>
          </div>
          {isNda && <NdaDownloadButton values={ndaValues} />}
          {activeSpec && !isNda && (
            <GenericDownloadButton spec={activeSpec} values={genericValues} />
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section aria-label="Input" className="lg:sticky lg:top-6 lg:self-start">
          {isNda ? (
            <Tabs defaultValue="chat">
              <TabsList>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="form">Form</TabsTrigger>
              </TabsList>
              <TabsContent value="chat">
                <DocumentChat
                  documentType={documentType}
                  isComplete={isComplete}
                  ndaValues={ndaValues}
                  genericValues={genericValues}
                  onState={handleChatState}
                />
              </TabsContent>
              <TabsContent value="form">
                <NdaForm values={ndaValues} onChange={handleNdaChange} />
              </TabsContent>
            </Tabs>
          ) : (
            <DocumentChat
              documentType={documentType}
              isComplete={isComplete}
              ndaValues={ndaValues}
              genericValues={genericValues}
              onState={handleChatState}
            />
          )}
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
    </div>
  );
}

function PreviewPlaceholder() {
  return (
    <article className="space-y-3 rounded-2xl border border-dashed border-indigo-200 bg-white/50 p-12 text-sm text-neutral-500">
      <h2 className="text-lg font-medium text-neutral-700">Preview</h2>
      <p>
        Once you tell the AI what kind of agreement you&apos;d like to draft, the
        document will appear here and update as you answer questions.
      </p>
    </article>
  );
}
