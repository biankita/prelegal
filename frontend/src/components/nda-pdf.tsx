"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import { formatEffectiveDate, type NdaData } from "@/lib/nda-schema";
import {
  STANDARD_TERMS,
  STANDARD_TERMS_FOOTER,
  fillClauseBody,
} from "@/lib/standard-terms";

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: "#111",
    lineHeight: 1.5,
  },
  h1: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  intro: {
    fontSize: 9,
    color: "#555",
    marginBottom: 18,
  },
  h2: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 4,
  },
  para: {
    marginBottom: 6,
  },
  table: {
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#999",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 6,
  },
  rowHeader: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    paddingVertical: 6,
  },
  cellLabel: {
    width: "20%",
    fontFamily: "Helvetica-Bold",
    paddingRight: 8,
  },
  cell: {
    width: "40%",
    paddingRight: 8,
  },
  cellHeader: {
    width: "40%",
    fontFamily: "Helvetica-Bold",
    paddingRight: 8,
  },
  rule: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    marginVertical: 18,
  },
  clause: {
    marginBottom: 8,
  },
  clauseNum: {
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    marginTop: 16,
    fontSize: 9,
    color: "#555",
  },
});

const placeholder = (s: string | undefined, fallback: string) =>
  s && s.trim() ? s : fallback;

export function NdaPdfDocument({ data }: { data: NdaData }) {
  const {
    purpose,
    effectiveDate,
    mndaTerm,
    confidentialityTerm,
    governingLaw,
    jurisdiction,
    modifications,
    party1,
    party2,
  } = data;

  return (
    <Document title="Mutual Non-Disclosure Agreement" author={party1.company}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.intro}>
          Cover Page + Common Paper Mutual NDA Standard Terms (Version 1.0).
        </Text>

        <Text style={styles.h2}>Purpose</Text>
        <Text style={styles.para}>{placeholder(purpose, "[Purpose]")}</Text>

        <Text style={styles.h2}>Effective date</Text>
        <Text style={styles.para}>
          {effectiveDate ? formatEffectiveDate(effectiveDate) : "[Effective date]"}
        </Text>

        <Text style={styles.h2}>MNDA term</Text>
        <Text style={styles.para}>
          {mndaTerm.type === "expires"
            ? `Expires ${mndaTerm.years} year(s) from the effective date.`
            : "Continues until terminated in accordance with the terms of the MNDA."}
        </Text>

        <Text style={styles.h2}>Term of confidentiality</Text>
        <Text style={styles.para}>
          {confidentialityTerm.type === "years"
            ? `${confidentialityTerm.years} year(s) from the effective date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable laws.`
            : "In perpetuity."}
        </Text>

        <Text style={styles.h2}>Governing law & jurisdiction</Text>
        <Text style={styles.para}>
          Governing Law: {placeholder(governingLaw, "[State]")}
          {"\n"}
          Jurisdiction: {placeholder(jurisdiction, "[City/county and state]")}
        </Text>

        {modifications && modifications.trim() && (
          <>
            <Text style={styles.h2}>MNDA modifications</Text>
            <Text style={styles.para}>{modifications}</Text>
          </>
        )}

        <Text style={styles.h2}>Signatures</Text>
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={styles.cellLabel} />
            <Text style={styles.cellHeader}>Party 1</Text>
            <Text style={styles.cellHeader}>Party 2</Text>
          </View>
          <SignatureRow label="Company" a={party1.company} b={party2.company} />
          <SignatureRow
            label="Print name"
            a={party1.signatory}
            b={party2.signatory}
          />
          <SignatureRow label="Title" a={party1.title} b={party2.title} />
          <SignatureRow
            label="Notice address"
            a={party1.noticeAddress}
            b={party2.noticeAddress}
          />
          <SignatureRow label="Signature" a=" " b=" " />
          <SignatureRow label="Date" a=" " b=" " />
        </View>

        <View style={styles.rule} />

        <Text style={styles.h2}>Standard Terms</Text>
        {STANDARD_TERMS.map((c) => (
          <Text key={c.number} style={styles.clause}>
            <Text style={styles.clauseNum}>
              {c.number}. {c.heading}.
            </Text>{" "}
            {fillClauseBody(c.body, { governingLaw, jurisdiction })}
          </Text>
        ))}
        <Text style={styles.footer}>{STANDARD_TERMS_FOOTER}</Text>
      </Page>
    </Document>
  );
}

function SignatureRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cell}>{a || " "}</Text>
      <Text style={styles.cell}>{b || " "}</Text>
    </View>
  );
}
