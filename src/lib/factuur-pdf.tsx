import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff2", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiA.woff2", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    padding: 50,
    color: "#1F2529",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  bedrijfsnaam: {
    fontSize: 20,
    fontWeight: 700,
    color: "#128C7E",
  },
  bedrijfsInfo: {
    fontSize: 9,
    color: "#64748B",
    lineHeight: 1.6,
  },
  factuurTitel: {
    fontSize: 28,
    fontWeight: 700,
    color: "#128C7E",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  infoBlock: {
    width: "48%",
  },
  infoLabel: {
    fontSize: 8,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 10,
    lineHeight: 1.6,
  },
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    padding: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    padding: 8,
  },
  colOmschrijving: { width: "40%" },
  colAantal: { width: "12%", textAlign: "center" },
  colPrijs: { width: "18%", textAlign: "right" },
  colBtw: { width: "12%", textAlign: "center" },
  colTotaal: { width: "18%", textAlign: "right" },
  headerText: {
    fontSize: 8,
    fontWeight: 600,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalen: {
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 30,
  },
  totalenRij: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 250,
    paddingVertical: 4,
  },
  totalenLabel: {
    width: 130,
    textAlign: "right",
    paddingRight: 15,
    color: "#64748B",
  },
  totalenWaarde: {
    width: 120,
    textAlign: "right",
  },
  totalenGroot: {
    fontSize: 14,
    fontWeight: 700,
    color: "#128C7E",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginVertical: 20,
  },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 15,
  },
  footerText: {
    fontSize: 9,
    color: "#64748B",
    lineHeight: 1.6,
  },
  notities: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
  },
  notitiesLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
  },
});

interface Regel {
  omschrijving: string;
  aantal: number | null;
  eenheidsprijs: number | null;
  btwPercentage: number | null;
  totaal: number | null;
}

interface FactuurPDFProps {
  factuur: {
    factuurnummer: string;
    factuurdatum: string | null;
    vervaldatum: string | null;
    bedragExclBtw: number;
    btwPercentage: number | null;
    btwBedrag: number | null;
    bedragInclBtw: number | null;
    notities: string | null;
    klantNaam: string;
    klantContactpersoon: string | null;
    klantEmail: string | null;
    klantAdres: string | null;
  };
  regels: Regel[];
  bedrijf: {
    bedrijfsnaam: string | null;
    adres: string | null;
    kvkNummer: string | null;
    btwNummer: string | null;
    email: string | null;
    telefoon: string | null;
    iban: string | null;
  };
}

function formatBedragPDF(bedrag: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(bedrag);
}

function formatDatumPDF(datum: string): string {
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function FactuurPDF({ factuur, regels, bedrijf }: FactuurPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.bedrijfsnaam}>{bedrijf.bedrijfsnaam || "Autronis"}</Text>
            <Text style={styles.bedrijfsInfo}>
              {bedrijf.adres ? `${bedrijf.adres}\n` : ""}
              {bedrijf.email ? `${bedrijf.email}\n` : ""}
              {bedrijf.telefoon ? `${bedrijf.telefoon}\n` : ""}
              {bedrijf.kvkNummer ? `KvK: ${bedrijf.kvkNummer}\n` : ""}
              {bedrijf.btwNummer ? `BTW: ${bedrijf.btwNummer}` : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.factuurTitel}>FACTUUR</Text>
          </View>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Factuur aan</Text>
            <Text style={styles.infoValue}>
              {factuur.klantNaam}
              {factuur.klantContactpersoon ? `\n${factuur.klantContactpersoon}` : ""}
              {factuur.klantAdres ? `\n${factuur.klantAdres}` : ""}
              {factuur.klantEmail ? `\n${factuur.klantEmail}` : ""}
            </Text>
          </View>
          <View style={[styles.infoBlock, { alignItems: "flex-end" }]}>
            <Text style={styles.infoLabel}>Factuurnummer</Text>
            <Text style={styles.infoValue}>{factuur.factuurnummer}</Text>
            <Text style={[styles.infoLabel, { marginTop: 10 }]}>Factuurdatum</Text>
            <Text style={styles.infoValue}>
              {factuur.factuurdatum ? formatDatumPDF(factuur.factuurdatum) : "—"}
            </Text>
            <Text style={[styles.infoLabel, { marginTop: 10 }]}>Vervaldatum</Text>
            <Text style={styles.infoValue}>
              {factuur.vervaldatum ? formatDatumPDF(factuur.vervaldatum) : "—"}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colOmschrijving]}>Omschrijving</Text>
            <Text style={[styles.headerText, styles.colAantal]}>Aantal</Text>
            <Text style={[styles.headerText, styles.colPrijs]}>Prijs</Text>
            <Text style={[styles.headerText, styles.colBtw]}>BTW %</Text>
            <Text style={[styles.headerText, styles.colTotaal]}>Totaal</Text>
          </View>
          {regels.map((regel, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colOmschrijving}>{regel.omschrijving}</Text>
              <Text style={styles.colAantal}>{regel.aantal || 1}</Text>
              <Text style={styles.colPrijs}>{formatBedragPDF(regel.eenheidsprijs || 0)}</Text>
              <Text style={styles.colBtw}>{regel.btwPercentage ?? 21}%</Text>
              <Text style={styles.colTotaal}>{formatBedragPDF(regel.totaal || 0)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalen}>
          <View style={styles.totalenRij}>
            <Text style={styles.totalenLabel}>Subtotaal</Text>
            <Text style={styles.totalenWaarde}>{formatBedragPDF(factuur.bedragExclBtw)}</Text>
          </View>
          <View style={styles.totalenRij}>
            <Text style={styles.totalenLabel}>BTW ({factuur.btwPercentage || 21}%)</Text>
            <Text style={styles.totalenWaarde}>{formatBedragPDF(factuur.btwBedrag || 0)}</Text>
          </View>
          <View style={[styles.totalenRij, { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.totalenLabel, styles.totalenGroot]}>Totaal</Text>
            <Text style={[styles.totalenWaarde, styles.totalenGroot]}>
              {formatBedragPDF(factuur.bedragInclBtw || 0)}
            </Text>
          </View>
        </View>

        {/* Notities */}
        {factuur.notities && (
          <View style={styles.notities}>
            <Text style={styles.notitiesLabel}>Opmerkingen</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>{factuur.notities}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {bedrijf.iban
              ? `Gelieve te betalen op IBAN ${bedrijf.iban} t.n.v. ${bedrijf.bedrijfsnaam || "Autronis"}`
              : ""}
            {factuur.vervaldatum
              ? `\nBetalingstermijn: ${factuur.vervaldatum ? `voor ${formatDatumPDF(factuur.vervaldatum)}` : ""}`
              : ""}
            {`\nO.v.v. ${factuur.factuurnummer}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
