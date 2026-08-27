import { Document, Page, Text, View, Image, StyleSheet, pdf, Font } from "@react-pdf/renderer";
import {
  docTotals,
  formatDateFR,
  formatEUR,
  lineTotals,
  siretLabel,
  PENDING_SIRET_MENTION,
  type BillingSettings,
  type DocumentPayload,
} from "@/lib/billing.shared";

const KANGGE_URL = "/__l5e/assets-v1/221e7992-708e-450e-9c98-c171951fb7b4/Kangge.ttf";
let kanggeReady = false;
function registerKangge() {
  if (kanggeReady) return;
  try {
    Font.register({ family: "Kangge", src: KANGGE_URL });
    kanggeReady = true;
  } catch {
    kanggeReady = false;
  }
}

const RED = "#dc2626";
const INK = "#111113";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const s = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: INK,
    paddingTop: 38,
    paddingBottom: 54,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
  },
  accent: { height: 3, backgroundColor: RED, marginBottom: 26 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  kicker: { fontSize: 8, letterSpacing: 1.6, color: MUTED, fontFamily: "Helvetica-Bold" },
  number: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 4 },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 3 },
  logo: { fontSize: 16 },
  clientBox: {
    marginTop: 26,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 12,
  },
  th: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 6,
    marginTop: 24,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 7,
  },
  thText: { fontSize: 7.5, letterSpacing: 1, color: MUTED, fontFamily: "Helvetica-Bold" },
  cLabel: { width: "46%" },
  cQty: { width: "10%", textAlign: "right" },
  cPu: { width: "16%", textAlign: "right" },
  cTva: { width: "12%", textAlign: "right" },
  cTot: { width: "16%", textAlign: "right" },
  totals: { marginTop: 16, alignSelf: "flex-end", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    padding: 9,
    borderRadius: 6,
    backgroundColor: "#fdeaea",
  },
  grandText: { color: RED, fontFamily: "Helvetica-Bold", fontSize: 11 },
  sectionTitle: {
    fontSize: 7.5,
    letterSpacing: 1.4,
    color: MUTED,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  block: { marginTop: 22 },
  body: { fontSize: 8.5, color: "#3f3f46", lineHeight: 1.5 },
  signBox: {
    width: 200,
    height: 92,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 8,
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
  },
});

export function DocumentPdf({
  doc,
  settings,
}: {
  doc: DocumentPayload;
  settings: BillingSettings;
}) {
  const isQuote = doc.kind === "quote";
  const totals = docTotals(doc.lines);
  const noVat = totals.total_tva === 0;

  return (
    <Document title={doc.number} author={settings.legalName || "Skale Visuals"}>
      <Page size="A4" style={s.page}>
        <View style={s.accent} />

        <View style={s.row}>
          <View>
            <Text style={s.kicker}>{isQuote ? "DEVIS" : "FACTURE"}</Text>
            <Text style={s.number}>{doc.number}</Text>
            <Text style={s.meta}>
              Émis le {formatDateFR(isQuote ? doc.createdAt : (doc.issuedAt ?? doc.createdAt))}
            </Text>
            <Text style={s.meta}>
              {isQuote
                ? `Valable jusqu'au ${formatDateFR(doc.validUntil)}`
                : `Échéance : ${formatDateFR(doc.dueAt)}`}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.logo, kanggeReady ? { fontFamily: "Kangge" } : { fontFamily: "Helvetica-Bold" }]}>
              skale visuals.
            </Text>
            <Text style={s.meta}>{settings.email || "contact@skalevisuals.com"}</Text>
            <Text style={s.meta}>SIRET : {siretLabel(settings)}</Text>
          </View>
        </View>

        <View style={s.clientBox}>
          <Text style={s.sectionTitle}>CLIENT</Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{doc.client.name}</Text>
          {!!doc.client.company && <Text style={s.meta}>{doc.client.company}</Text>}
          {!!doc.client.siret && <Text style={s.meta}>SIRET : {doc.client.siret}</Text>}
          {!!doc.client.email && <Text style={s.meta}>{doc.client.email}</Text>}
          {!!doc.client.address && <Text style={s.meta}>{doc.client.address}</Text>}
        </View>

        <View style={s.th}>
          <Text style={[s.thText, s.cLabel]}>PRESTATION</Text>
          <Text style={[s.thText, s.cQty]}>QTÉ</Text>
          <Text style={[s.thText, s.cPu]}>PU HT</Text>
          <Text style={[s.thText, s.cTva]}>TVA</Text>
          <Text style={[s.thText, s.cTot]}>TOTAL HT</Text>
        </View>
        {doc.lines.map((l, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.cLabel}>{l.label}</Text>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cPu}>{formatEUR(l.unit_price_ht)}</Text>
            <Text style={s.cTva}>{l.tva_rate}%</Text>
            <Text style={s.cTot}>{formatEUR(lineTotals(l).ht)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={{ color: MUTED }}>Sous-total HT</Text>
            <Text>{formatEUR(totals.total_ht)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={{ color: MUTED }}>TVA</Text>
            <Text>{formatEUR(totals.total_tva)}</Text>
          </View>
          <View style={s.grand}>
            <Text style={s.grandText}>Total TTC</Text>
            <Text style={s.grandText}>{formatEUR(totals.total_ttc)}</Text>
          </View>
        </View>

        {!!(doc.conditions ?? "").trim() && (
          <View style={s.block}>
            <Text style={s.sectionTitle}>CONDITIONS GÉNÉRALES</Text>
            <Text style={s.body}>{doc.conditions}</Text>
          </View>
        )}

        {!isQuote && (!!settings.iban || !!settings.bic) && (
          <View style={s.block}>
            <Text style={s.sectionTitle}>RÈGLEMENT PAR VIREMENT</Text>
            {!!settings.iban && <Text style={s.body}>IBAN : {settings.iban}</Text>}
            {!!settings.bic && <Text style={s.body}>BIC : {settings.bic}</Text>}
          </View>
        )}

        {noVat && (
          <Text style={[s.body, { marginTop: 14, color: MUTED }]}>
            TVA non applicable, art. 293 B du CGI
          </Text>
        )}

        {(settings.siretPending || !settings.siret.trim()) && (
          <Text style={[s.body, { marginTop: 6, color: MUTED, fontSize: 7.5 }]}>
            {PENDING_SIRET_MENTION}
          </Text>
        )}

        {isQuote && (
          <View style={[s.block, { alignItems: "flex-end" }]} wrap={false}>
            <Text
              style={[s.body, { fontFamily: "Helvetica-Oblique", fontSize: 10, color: INK, textAlign: "right" }]}
            >
              Bon pour accord
            </Text>
            <View style={[s.signBox, { marginTop: 4 }]}>
              {doc.signature?.dataUrl ? (
                <Image src={doc.signature.dataUrl} style={{ height: 62, objectFit: "contain" }} />
              ) : doc.signature?.name ? (
                <Text style={{ marginTop: 24, fontSize: 14, color: RED, textAlign: "center" }}>
                  {doc.signature.name}
                </Text>
              ) : null}
            </View>
            {!!doc.signature?.signedAt && (
              <Text style={[s.body, { marginTop: 5, color: RED, textAlign: "right" }]}>
                Signé électroniquement par {doc.signature.name ?? ""} le{" "}
                {formatDateFR(doc.signature.signedAt)}
              </Text>
            )}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text
            style={[
              { fontSize: 12 },
              kanggeReady ? { fontFamily: "Kangge" } : { fontFamily: "Helvetica-Bold" },
            ]}
          >
            skale visuals.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateDocumentBlob(doc: DocumentPayload, settings: BillingSettings) {
  registerKangge();
  return await pdf(<DocumentPdf doc={doc} settings={settings} />).toBlob();
}
