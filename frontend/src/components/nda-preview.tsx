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
    <article className="space-y-3 rounded-md border bg-white p-8 text-sm leading-relaxed text-neutral-900 shadow-sm">
      <h1 className="!mb-2 text-2xl font-bold">
        Mutual Non-Disclosure Agreement
      </h1>
      <p className="!mt-0 text-xs text-neutral-600">
        Cover Page + Common Paper Mutual NDA Standard Terms (Version 1.0).
      </p>

      <h2 className="mt-6 text-base font-semibold">Purpose</h2>
      <p>{placeholder(values.purpose, "[Purpose]")}</p>

      <h2 className="text-base font-semibold">Effective date</h2>
      <p>
        {values.effectiveDate
          ? formatEffectiveDate(values.effectiveDate)
          : "[Effective date]"}
      </p>

      <h2 className="text-base font-semibold">MNDA term</h2>
      <p>
        {values.mndaTerm.type === "expires"
          ? `Expires ${values.mndaTerm.years ?? "[N]"} year(s) from the effective date.`
          : "Continues until terminated in accordance with the terms of the MNDA."}
      </p>

      <h2 className="text-base font-semibold">Term of confidentiality</h2>
      <p>
        {values.confidentialityTerm.type === "years"
          ? `${values.confidentialityTerm.years ?? "[N]"} year(s) from the effective date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable laws.`
          : "In perpetuity."}
      </p>

      <h2 className="text-base font-semibold">Governing law &amp; jurisdiction</h2>
      <p>
        Governing Law: {placeholder(values.governingLaw, "[State]")}
        <br />
        Jurisdiction: {placeholder(values.jurisdiction, "[City/county and state]")}
      </p>

      {values.modifications && values.modifications.trim() && (
        <>
          <h2 className="text-base font-semibold">MNDA modifications</h2>
          <p className="whitespace-pre-line">{values.modifications}</p>
        </>
      )}

      <h2 className="text-base font-semibold">Signatures</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left font-medium" />
            <th className="py-2 text-left font-medium">Party 1</th>
            <th className="py-2 text-left font-medium">Party 2</th>
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

      <hr className="my-8" />

      <h2 className="text-lg font-semibold">Standard Terms</h2>
      <ol className="space-y-3 pl-5">
        {STANDARD_TERMS.map((c) => (
          <li key={c.number}>
            <strong>{c.heading}.</strong>{" "}
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
