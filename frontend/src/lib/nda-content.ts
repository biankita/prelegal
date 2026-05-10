import { formatEffectiveDate, type NdaFormValues } from "@/lib/nda-schema";

export type SectionStrings = {
  purpose: string;
  effectiveDate: string;
  mndaTerm: string;
  confidentialityTerm: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string | null;
};

export type SignatureRow = {
  label: string;
  party1: string;
  party2: string;
};

export type NdaContent = {
  sections: SectionStrings;
  signatureRows: SignatureRow[];
  governingLaw: string;
  jurisdiction: string;
};

const fallback = (s: string | undefined, alt: string): string =>
  s && s.trim() ? s : alt;

export function buildNdaContent(values: NdaFormValues): NdaContent {
  const governingLaw = fallback(values.governingLaw, "[State]");
  const jurisdiction = fallback(values.jurisdiction, "[City/county and state]");

  const mndaYears =
    values.mndaTerm.type === "expires"
      ? values.mndaTerm.years || "[N]"
      : null;

  const confYears =
    values.confidentialityTerm.type === "years"
      ? values.confidentialityTerm.years || "[N]"
      : null;

  const sections: SectionStrings = {
    purpose: fallback(values.purpose, "[Purpose]"),
    effectiveDate: values.effectiveDate
      ? formatEffectiveDate(values.effectiveDate)
      : "[Effective date]",
    mndaTerm:
      values.mndaTerm.type === "expires"
        ? `Expires ${mndaYears} year(s) from the effective date.`
        : "Continues until terminated in accordance with the terms of the MNDA.",
    confidentialityTerm:
      values.confidentialityTerm.type === "years"
        ? `${confYears} year(s) from the effective date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable laws.`
        : "In perpetuity.",
    governingLaw,
    jurisdiction,
    modifications:
      values.modifications && values.modifications.trim()
        ? values.modifications
        : null,
  };

  const signatureRows: SignatureRow[] = [
    { label: "Company", party1: values.party1.company, party2: values.party2.company },
    { label: "Print name", party1: values.party1.signatory, party2: values.party2.signatory },
    { label: "Title", party1: values.party1.title, party2: values.party2.title },
    {
      label: "Notice address",
      party1: values.party1.noticeAddress,
      party2: values.party2.noticeAddress,
    },
    { label: "Signature", party1: "", party2: "" },
    { label: "Date", party1: "", party2: "" },
  ];

  return { sections, signatureRows, governingLaw, jurisdiction };
}
