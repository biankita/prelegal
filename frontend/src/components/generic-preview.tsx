"use client";

import type { DocumentSpec } from "@/lib/documents";
import type { GenericValues } from "@/lib/document-state";
import { formatEffectiveDate } from "@/lib/nda-schema";

type Props = { spec: DocumentSpec; values: GenericValues };

const placeholder = (s: string | undefined, fallback: string) =>
  s && s.trim() ? s : fallback;

export function GenericPreview({ spec, values }: Props) {
  const { common, extras } = values;
  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-white p-8 text-sm leading-relaxed text-neutral-900 shadow-xl shadow-indigo-900/5 ring-1 ring-black/[0.02]">
      <div className="-mx-8 -mt-8 mb-4 rounded-t-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-8 py-6">
        <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200">
          Preview
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
          {spec.displayName}
        </h1>
        <p className="mt-1 text-xs text-neutral-600">
          Cover Page incorporating Common Paper {spec.displayName} Standard Terms
          (Version {spec.termsVersion}).
        </p>
      </div>

      <SectionHeading>Purpose</SectionHeading>
      <p>{placeholder(common.purpose, "[Purpose]")}</p>

      <SectionHeading>Effective date</SectionHeading>
      <p>
        {common.effectiveDate
          ? formatEffectiveDate(common.effectiveDate)
          : "[Effective date]"}
      </p>

      <SectionHeading>Governing law &amp; jurisdiction</SectionHeading>
      <p>
        Governing Law: {placeholder(common.governingLaw, "[State]")}
        <br />
        Jurisdiction: {placeholder(common.jurisdiction, "[City/county and state]")}
      </p>

      {spec.extraFields.length > 0 && (
        <>
          <SectionHeading>{spec.displayName} terms</SectionHeading>
          <dl className="space-y-2">
            {spec.extraFields.map((f) => (
              <div key={f.name}>
                <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {f.label}
                </dt>
                <dd>{placeholder(extras[f.name], `[${f.label}]`)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <SectionHeading>Signatures</SectionHeading>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-indigo-100">
            <th className="py-2 text-left font-medium text-neutral-600" />
            <th className="py-2 text-left font-medium text-neutral-700">Party 1</th>
            <th className="py-2 text-left font-medium text-neutral-700">Party 2</th>
          </tr>
        </thead>
        <tbody>
          <SignatureRow label="Company" a={common.party1.company} b={common.party2.company} />
          <SignatureRow label="Print name" a={common.party1.signatory} b={common.party2.signatory} />
          <SignatureRow label="Title" a={common.party1.title} b={common.party2.title} />
          <SignatureRow
            label="Notice address"
            a={common.party1.noticeAddress}
            b={common.party2.noticeAddress}
          />
          <SignatureRow label="Signature" a="" b="" />
          <SignatureRow label="Date" a="" b="" />
        </tbody>
      </table>

      <div className="my-8 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />

      <p className="text-xs text-neutral-600">
        This Cover Page incorporates by reference the Common Paper {spec.displayName}{" "}
        Standard Terms (Version {spec.termsVersion}), available at{" "}
        <a
          href={spec.termsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-700 underline"
        >
          {spec.termsUrl}
        </a>
        . Any modifications to the Standard Terms should be made on this Cover Page,
        which will control over conflicts with the Standard Terms.
      </p>
    </article>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-6 flex items-center gap-2 text-base font-semibold tracking-tight text-neutral-900">
      <span
        aria-hidden
        className="inline-block h-4 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600"
      />
      {children}
    </h2>
  );
}

function SignatureRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr className="border-b align-top">
      <td className="py-2 pr-3 font-medium">{label}</td>
      <td className="whitespace-pre-line py-2 pr-3">{a || " "}</td>
      <td className="whitespace-pre-line py-2">{b || " "}</td>
    </tr>
  );
}
