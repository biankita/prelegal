"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { ndaSchema, type NdaFormValues } from "@/lib/nda-schema";
import { NdaPdfDocument } from "@/components/nda-pdf";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <Button type="button" disabled>
        Preparing PDF…
      </Button>
    ),
  },
);

type Props = { values: NdaFormValues };

export function NdaDownloadButton({ values }: Props) {
  const parsed = useMemo(() => ndaSchema.safeParse(values), [values]);

  if (!parsed.success) {
    return (
      <div className="flex items-center gap-3">
        <p className="hidden text-xs text-muted-foreground sm:block">
          Complete the required fields to enable download.
        </p>
        <Button type="button" disabled title="Fill in all required fields">
          Download PDF
        </Button>
      </div>
    );
  }

  const fileName = buildFileName(parsed.data.party1.company, parsed.data.party2.company);

  return (
    <PDFDownloadLink
      document={<NdaPdfDocument data={parsed.data} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button type="button" disabled={loading}>
          {loading ? "Generating…" : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}

function buildFileName(a: string, b: string): string {
  const slug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "party";
  return `mutual-nda-${slug(a)}-${slug(b)}.pdf`;
}
