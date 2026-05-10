"use client";

import { formatEffectiveDate, type NdaFormValues } from "@/lib/nda-schema";
import {
  STANDARD_TERMS,
  STANDARD_TERMS_FOOTER,
  fillClauseBody,
} from "@/lib/standard-terms";

type Props = { values: NdaFormValues };

export function NdaPreview({ values }: Props) {
  const placeholder = (s: string | undefined, fallback: string) =>
    s && s.trim() ? s : fallback;

  return (
    <article className="space-y-3 rounded-2xl border border-border/60 bg-white p-8 text-sm leading-relaxed text-neutral-900 shadow-xl shadow-indigo-900/5 ring-1 ring-black/[0.02]">
      <div className="-mx-8 -mt-8 mb-4 rounded-t-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-8 py-6">
        <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200">
          Preview
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
          Mutual Non-Disclosure Agreement
        </h1>
        <p className="mt-1 text-xs text-neutral-600">
          Cover Page + Common Paper Mutual NDA Standard Terms (Version 1.0).
        </p>
      </div>

      <SectionHeading>Purpose</SectionHeading>
      <p>{placeholder(values.purpose, "[Purpose]")}</p>

      <SectionHeading>Effective date</SectionHeading>
      <p>
        {values.effectiveDate
          ? formatEffectiveDate(values.effectiveDate)
          : "[Effective date]"}
      </p>

      <SectionHeading>MNDA term</SectionHeading>
      <p>
        {values.mndaTerm.type === "expires"
          ? `Expires ${values.mndaTerm.years ?? "[N]"} year(s) from the effective date.`
          : "Continues until terminated in accordance with the terms of the MNDA."}
      </p>

      <SectionHeading>Term of confidentiality</SectionHeading>
      <p>
        {values.confidentialityTerm.type === "years"
          ? `${values.confidentialityTerm.years ?? "[N]"} year(s) from the effective date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable laws.`
          : "In perpetuity."}
      </p>

      <SectionHeading>Governing law &amp; jurisdiction</SectionHeading>
      <p>
        Governing Law: {placeholder(values.governingLaw, "[State]")}
        <br />
        Jurisdiction: {placeholder(values.jurisdiction, "[City/county and state]")}
      </p>

      {values.modifications && values.modifications.trim() && (
        <>
          <SectionHeading>MNDA modifications</SectionHeading>
          <p className="whitespace-pre-line">{values.modifications}</p>
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
          <SignatureRow label="Company" a={values.party1.company} b={values.party2.company} />
          <SignatureRow label="Print name" a={values.party1.signatory} b={values.party2.signatory} />
          <SignatureRow label="Title" a={values.party1.title} b={values.party2.title} />
          <SignatureRow
            label="Notice address"
            a={values.party1.noticeAddress}
            b={values.party2.noticeAddress}
          />
          <SignatureRow label="Signature" a="" b="" />
          <SignatureRow label="Date" a="" b="" />
        </tbody>
      </table>

      <div className="my-8 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />

      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
        Standard Terms
      </h2>
      <ol className="space-y-3 pl-5">
        {STANDARD_TERMS.map((c) => (
          <li key={c.number}>
            <strong className="text-indigo-900">{c.heading}.</strong>{" "}
            {fillClauseBody(c.body, {
              governingLaw: values.governingLaw,
              jurisdiction: values.jurisdiction,
            })}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-neutral-600">{STANDARD_TERMS_FOOTER}</p>
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

function SignatureRow({
  label,
  a,
  b,
}: {
  label: string;
  a: string;
  b: string;
}) {
  return (
    <tr className="border-b align-top">
      <td className="py-2 pr-3 font-medium">{label}</td>
      <td className="whitespace-pre-line py-2 pr-3">{a || " "}</td>
      <td className="whitespace-pre-line py-2">{b || " "}</td>
    </tr>
  );
}
