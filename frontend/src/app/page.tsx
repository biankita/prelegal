"use client";

import { useCallback, useState } from "react";

import { NdaDownloadButton } from "@/components/nda-download-button";
import { NdaForm } from "@/components/nda-form";
import { NdaPreview } from "@/components/nda-preview";
import { ndaDefaults, type NdaFormValues } from "@/lib/nda-schema";

export default function Home() {
  const [values, setValues] = useState<NdaFormValues>(ndaDefaults);
  const handleChange = useCallback((next: NdaFormValues) => setValues(next), []);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Mutual NDA creator
            </h1>
            <p className="text-sm text-muted-foreground">
              Fill in the details, preview the agreement, then download a PDF.
            </p>
          </div>
          <NdaDownloadButton values={values} />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section aria-label="Form" className="lg:sticky lg:top-6 lg:self-start">
          <NdaForm onChange={handleChange} />
        </section>
        <section aria-label="Preview">
          <NdaPreview values={values} />
        </section>
      </main>
    </div>
  );
}
