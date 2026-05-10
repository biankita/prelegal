"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import type { DocumentSpec } from "@/lib/documents";
import type { GenericValues } from "@/lib/document-state";
import { formatEffectiveDate } from "@/lib/nda-schema";

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
  fieldLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#555",
    marginTop: 6,
  },
  fieldValue: {
    marginBottom: 2,
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
  footer: {
    marginTop: 16,
    fontSize: 9,
    color: "#555",
  },
});

const placeholder = (s: string | undefined, fallback: string) =>
  s && s.trim() ? s : fallback;

type Props = { spec: DocumentSpec; values: GenericValues };

export function GenericPdfDocument({ spec, values }: Props) {
  const { common, extras } = values;
  return (
    <Document title={spec.displayName} author={common.party1.company}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>{spec.displayName}</Text>
        <Text style={styles.intro}>
          Cover Page incorporating Common Paper {spec.displayName} Standard Terms
          (Version {spec.termsVersion}).
        </Text>

        <Text style={styles.h2}>Purpose</Text>
        <Text style={styles.para}>{placeholder(common.purpose, "[Purpose]")}</Text>

        <Text style={styles.h2}>Effective date</Text>
        <Text style={styles.para}>
          {common.effectiveDate
            ? formatEffectiveDate(common.effectiveDate)
            : "[Effective date]"}
        </Text>

        <Text style={styles.h2}>Governing law & jurisdiction</Text>
        <Text style={styles.para}>
          Governing Law: {placeholder(common.governingLaw, "[State]")}
          {"\n"}
          Jurisdiction: {placeholder(common.jurisdiction, "[City/county and state]")}
        </Text>

        {spec.extraFields.length > 0 && (
          <>
            <Text style={styles.h2}>{spec.displayName} terms</Text>
            {spec.extraFields.map((f) => (
              <View key={f.name}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <Text style={styles.fieldValue}>
                  {placeholder(extras[f.name], `[${f.label}]`)}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.h2}>Signatures</Text>
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={styles.cellLabel} />
            <Text style={styles.cellHeader}>Party 1</Text>
            <Text style={styles.cellHeader}>Party 2</Text>
          </View>
          <SignatureRow label="Company" a={common.party1.company} b={common.party2.company} />
          <SignatureRow
            label="Print name"
            a={common.party1.signatory}
            b={common.party2.signatory}
          />
          <SignatureRow label="Title" a={common.party1.title} b={common.party2.title} />
          <SignatureRow
            label="Notice address"
            a={common.party1.noticeAddress}
            b={common.party2.noticeAddress}
          />
          <SignatureRow label="Signature" a=" " b=" " />
          <SignatureRow label="Date" a=" " b=" " />
        </View>

        <View style={styles.rule} />

        <Text style={styles.footer}>
          This Cover Page incorporates by reference the Common Paper{" "}
          {spec.displayName} Standard Terms (Version {spec.termsVersion}),
          available at {spec.termsUrl}.
        </Text>
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
