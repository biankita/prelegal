"use client";

import { useCallback, useState } from "react";

import { NdaChat } from "@/components/nda-chat";
import { NdaDownloadButton } from "@/components/nda-download-button";
import { NdaForm } from "@/components/nda-form";
import { NdaPreview } from "@/components/nda-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ndaDefaults, type NdaFormValues } from "@/lib/nda-schema";

export default function Home() {
  const [values, setValues] = useState<NdaFormValues>(ndaDefaults);
  const handleChange = useCallback((next: NdaFormValues) => setValues(next), []);

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
                Mutual NDA creator
              </h1>
              <p className="text-sm text-muted-foreground">
                Chat with the AI or fill in the form, then download the PDF.
              </p>
            </div>
          </div>
          <NdaDownloadButton values={values} />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section aria-label="Input" className="lg:sticky lg:top-6 lg:self-start">
          <Tabs defaultValue="chat">
            <TabsList>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="form">Form</TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              <NdaChat values={values} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="form">
              <NdaForm values={values} onChange={handleChange} />
            </TabsContent>
          </Tabs>
        </section>
        <section aria-label="Preview">
          <NdaPreview values={values} />
        </section>
      </main>
    </div>
  );
}
