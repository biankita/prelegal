import { z } from "zod";

const partySchema = z.object({
  company: z.string().min(1, "Required"),
  signatory: z.string().min(1, "Required"),
  title: z.string().min(1, "Required"),
  noticeAddress: z.string().min(1, "Required"),
});

export const ndaSchema = z.object({
  purpose: z.string().min(1, "Required"),
  effectiveDate: z.string().min(1, "Required"),

  mndaTerm: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("expires"),
      years: z.coerce.number().int().min(1, "At least 1"),
    }),
    z.object({ type: z.literal("untilTerminated") }),
  ]),

  confidentialityTerm: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("years"),
      years: z.coerce.number().int().min(1, "At least 1"),
    }),
    z.object({ type: z.literal("perpetuity") }),
  ]),

  governingLaw: z.string().min(1, "Required"),
  jurisdiction: z.string().min(1, "Required"),

  party1: partySchema,
  party2: partySchema,

  modifications: z.string().optional().default(""),
});

export type NdaFormValues = z.input<typeof ndaSchema>;
export type NdaData = z.output<typeof ndaSchema>;

export const DEFAULT_PURPOSE =
  "Evaluating whether to enter into a business relationship with the other party.";

export const ndaDefaults: NdaFormValues = {
  purpose: DEFAULT_PURPOSE,
  effectiveDate: todayIso(),
  mndaTerm: { type: "expires", years: 1 },
  confidentialityTerm: { type: "years", years: 1 },
  governingLaw: "",
  jurisdiction: "",
  party1: { company: "", signatory: "", title: "", noticeAddress: "" },
  party2: { company: "", signatory: "", title: "", noticeAddress: "" },
  modifications: "",
};

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Parse YYYY-MM-DD as local-calendar (not UTC) to avoid timezone-shift display bugs.
export function formatEffectiveDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
