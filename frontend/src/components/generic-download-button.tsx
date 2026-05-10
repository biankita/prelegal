"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { GenericPdfDocument } from "@/components/generic-pdf";
import { isGenericComplete, type GenericValues } from "@/lib/document-state";
import type { DocumentSpec } from "@/lib/documents";
import { slugifyCompanyName } from "@/lib/utils";

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

type Props = { spec: DocumentSpec; values: GenericValues };

export function GenericDownloadButton({ spec, values }: Props) {
  const complete = useMemo(() => isGenericComplete(values, spec), [values, spec]);

  if (!complete) {
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

  const fileName = buildFileName(
    spec.slug,
    values.common.party1.company,
    values.common.party2.company,
  );

  return (
    <PDFDownloadLink
      document={<GenericPdfDocument spec={spec} values={values} />}
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

function buildFileName(slug: string, a: string, b: string): string {
  return `${slug.replaceAll("_", "-")}-${slugifyCompanyName(a)}-${slugifyCompanyName(b)}.pdf`;
}
