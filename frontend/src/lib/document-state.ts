// Generic value shape used for every non-NDA document. Mirrors the backend
// `GenericValues` model.

import type { DocumentSpec } from "@/lib/documents";

export type Party = {
  company: string;
  signatory: string;
  title: string;
  noticeAddress: string;
};

export type CommonCover = {
  purpose: string;
  effectiveDate: string;
  governingLaw: string;
  jurisdiction: string;
  party1: Party;
  party2: Party;
};

export type GenericValues = {
  common: CommonCover;
  extras: Record<string, string>;
};

export const emptyParty: Party = {
  company: "",
  signatory: "",
  title: "",
  noticeAddress: "",
};

export const emptyCommonCover: CommonCover = {
  purpose: "",
  effectiveDate: "",
  governingLaw: "",
  jurisdiction: "",
  party1: { ...emptyParty },
  party2: { ...emptyParty },
};

export const emptyGenericValues: GenericValues = {
  common: emptyCommonCover,
  extras: {},
};

export function isGenericComplete(
  values: GenericValues,
  spec: DocumentSpec,
): boolean {
  const c = values.common;
  if (
    !c.purpose ||
    !c.effectiveDate ||
    !c.governingLaw ||
    !c.jurisdiction
  ) {
    return false;
  }
  for (const p of [c.party1, c.party2]) {
    if (!p.company || !p.signatory || !p.title || !p.noticeAddress) return false;
  }
  for (const f of spec.extraFields) {
    if (!values.extras[f.name]) return false;
  }
  return true;
}
