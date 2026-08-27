import {
  docTotals,
  formatDateFR,
  formatEUR,
  lineTotals,
  type BillingSettings,
  type DocumentPayload,
} from "@/lib/billing.shared";

export async function downloadDocumentPdf(
  doc: DocumentPayload,
  settings: BillingSettings,
  filename?: string,
) {
  const { generateDocumentBlob } = await import("@/components/DocumentPdfDoc");
  const blob = await generateDocumentBlob(doc, settings);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${doc.number}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const RED = "#dc2626";

/** Paper-style rendering of a quote/invoice — mirrors the exported PDF. */
export function DocumentPaper({
  doc,
  settings,
  dark = false,
}: {
  doc: DocumentPayload;
  settings: BillingSettings;
  dark?: boolean;
}) {
  const isQuote = doc.kind === "quote";
  const totals = docTotals(doc.lines);
  const noVat = totals.total_tva === 0;

  const bg = dark ? "#131316" : "#ffffff";
  const ink = dark ? "#f4f4f5" : "#111113";
  const muted = dark ? "#9ca3af" : "#6b7280";
  const line = dark ? "rgba(255,255,255,0.10)" : "#e5e7eb";
  const soft = dark ? "rgba(255,255,255,0.03)" : "#fafafa";

  const Th = ({ children, align = "left", w }: any) => (
    <th
      style={{
        textAlign: align,
        width: w,
        color: muted,
        fontSize: 10,
        letterSpacing: "0.12em",
        fontWeight: 600,
        padding: "0 0 8px",
        borderBottom: `1px solid ${ink}`,
      }}
    >
      {children}
    </th>
  );
  const Td = ({ children, align = "left" }: any) => (
    <td
      style={{
        textAlign: align,
        padding: "10px 0",
        borderBottom: `1px solid ${line}`,
        fontSize: 13,
        color: ink,
      }}
    >
      {children}
    </td>
  );

  return (
    <div
      style={{
        background: bg,
        color: ink,
        borderRadius: 20,
        border: `1px solid ${line}`,
        overflow: "hidden",
        boxShadow: dark ? "none" : "0 16px 48px rgba(0,0,0,0.10)",
      }}
    >
      <div style={{ height: 3, background: RED }} />
      <div style={{ padding: "28px 30px 32px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              {isQuote ? "DEVIS" : "FACTURE"}
            </p>
            <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>
              {doc.number}
            </p>
            <p style={{ fontSize: 12, color: muted, marginTop: 6 }}>
              Émis le {formatDateFR(isQuote ? doc.createdAt : (doc.issuedAt ?? doc.createdAt))}
            </p>
            <p style={{ fontSize: 12, color: muted }}>
              {isQuote
                ? `Valable jusqu'au ${formatDateFR(doc.validUntil)}`
                : `Échéance : ${formatDateFR(doc.dueAt)}`}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 24, fontFamily: "Kangge, inherit", letterSpacing: "0.02em" }}>
              skale visuals.
            </p>
            <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>
              {settings.email || "contact@skalevisuals.com"}
            </p>
            {!!settings.siret && (
              <p style={{ fontSize: 12, color: muted }}>SIRET : {settings.siret}</p>
            )}
          </div>
        </div>

        {/* Client */}
        <div
          style={{
            marginTop: 26,
            border: `1px solid ${line}`,
            background: soft,
            borderRadius: 12,
            padding: 14,
          }}
        >
          <p style={{ fontSize: 10, letterSpacing: "0.14em", color: muted, fontWeight: 600 }}>
            CLIENT
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{doc.client.name}</p>
          {!!doc.client.company && (
            <p style={{ fontSize: 12, color: muted }}>{doc.client.company}</p>
          )}
          {!!doc.client.email && <p style={{ fontSize: 12, color: muted }}>{doc.client.email}</p>}
        </div>

        {/* Lines */}
        <table style={{ width: "100%", marginTop: 26, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th w="44%">PRESTATION</Th>
              <Th align="right" w="10%">QTÉ</Th>
              <Th align="right" w="16%">PU HT</Th>
              <Th align="right" w="12%">TVA</Th>
              <Th align="right" w="18%">TOTAL HT</Th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l, i) => (
              <tr key={i}>
                <Td>{l.label}</Td>
                <Td align="right">{l.quantity}</Td>
                <Td align="right">{formatEUR(l.unit_price_ht)}</Td>
                <Td align="right">{l.tva_rate}%</Td>
                <Td align="right">{formatEUR(lineTotals(l).ht)}</Td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <div style={{ width: 300 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span style={{ color: muted }}>Sous-total HT</span>
              <span>{formatEUR(totals.total_ht)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span style={{ color: muted }}>TVA</span>
              <span>{formatEUR(totals.total_tva)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                padding: "12px 14px",
                borderRadius: 12,
                background: dark ? "rgba(220,38,38,0.16)" : "#fdeaea",
                color: RED,
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              <span>Total TTC</span>
              <span>{formatEUR(totals.total_ttc)}</span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        {!!(doc.conditions ?? "").trim() && (
          <div style={{ marginTop: 26 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.14em", color: muted, fontWeight: 600 }}>
              CONDITIONS GÉNÉRALES
            </p>
            <p style={{ fontSize: 12.5, color: muted, marginTop: 6, whiteSpace: "pre-line", lineHeight: 1.6 }}>
              {doc.conditions}
            </p>
          </div>
        )}

        {!isQuote && (!!settings.iban || !!settings.bic) && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.14em", color: muted, fontWeight: 600 }}>
              RÈGLEMENT PAR VIREMENT
            </p>
            {!!settings.iban && (
              <p style={{ fontSize: 12.5, color: muted, marginTop: 4 }}>IBAN : {settings.iban}</p>
            )}
            {!!settings.bic && <p style={{ fontSize: 12.5, color: muted }}>BIC : {settings.bic}</p>}
          </div>
        )}

        {noVat && (
          <p style={{ fontSize: 12, color: muted, marginTop: 18 }}>
            TVA non applicable, art. 293 B du CGI
          </p>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 34,
            paddingTop: 18,
            borderTop: `1px solid ${line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ fontSize: 20, fontFamily: "Kangge, inherit", letterSpacing: "0.02em" }}>
              skale visuals.
            </p>
          </div>

          {isQuote && (
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 13, fontStyle: "italic", color: ink }}>Bon pour accord</p>
              <div
                style={{
                  marginTop: 6,
                  width: 240,
                  height: 96,
                  border: `1px dashed ${line}`,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: soft,
                  overflow: "hidden",
                }}
              >
                {doc.signature?.dataUrl ? (
                  <img
                    src={doc.signature.dataUrl}
                    alt="Signature du client"
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                  />
                ) : doc.signature?.name ? (
                  <span style={{ color: RED, fontSize: 20 }}>{doc.signature.name}</span>
                ) : (
                  <span style={{ color: muted, fontSize: 11 }}>Signature du client</span>
                )}
              </div>
              {!!doc.signature?.signedAt && (
                <p style={{ fontSize: 11, color: RED, marginTop: 6 }}>
                  Signé le {formatDateFR(doc.signature.signedAt)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
