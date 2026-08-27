import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  docTotals,
  formatDateFR,
  formatEUR,
  lineTotals,
  type BillingSettings,
  type DocLine,
} from "@/lib/billing.shared";

const A4: [number, number] = [595.28, 841.89];
const M = 48;
const INK = rgb(0.06, 0.06, 0.07);
const MUTED = rgb(0.45, 0.45, 0.48);
const LINE = rgb(0.87, 0.87, 0.88);
const ACCENT = rgb(0.88, 0.11, 0.28);

const LOGO_URL = "https://skalevisuals.com/email/skale-logo.png";

export type PdfDoc = {
  kind: "quote" | "invoice";
  number: string;
  createdAt: string;
  issuedAt?: string | null;
  dueAt?: string | null;
  validUntil?: string | null;
  client: { name: string; company?: string | null; email?: string | null; address?: string | null };
  lines: DocLine[];
  notes?: string | null;
  conditions?: string | null;
  signature?: { dataUrl: string | null; name: string | null; signedAt: string | null } | null;
};

function sanitize(s: string): string {
  // WinAnsi-safe: strip characters the standard fonts cannot encode.
  return (s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of sanitize(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  return out;
}

function draw(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
) {
  page.drawText(sanitize(text), { x, y, size, font, color });
}

function drawRight(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
) {
  const t = sanitize(text);
  page.drawText(t, { x: right - font.widthOfTextAtSize(t, size), y, size, font, color });
}

export async function renderDocumentPdf(
  doc: PdfDoc,
  settings: BillingSettings,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage(A4);
  const W = A4[0];
  const right = W - M;
  let y = A4[1] - M;

  // ---- Header: logo + document title
  let logoDrawn = false;
  try {
    const res = await fetch(LOGO_URL);
    if (res.ok) {
      const img = await pdf.embedPng(new Uint8Array(await res.arrayBuffer()));
      const w = 92;
      const h = (img.height / img.width) * w;
      page.drawImage(img, { x: M, y: y - h + 6, width: w, height: h });
      logoDrawn = true;
    }
  } catch {
    /* fallback below */
  }
  if (!logoDrawn) draw(page, "skale.", M, y - 16, bold, 24);

  const isQuote = doc.kind === "quote";
  drawRight(page, isQuote ? "DEVIS" : "FACTURE", right, y - 6, bold, 22);
  drawRight(page, doc.number, right, y - 24, regular, 11, MUTED);
  y -= 52;

  drawRight(
    page,
    isQuote
      ? `Date d'émission : ${formatDateFR(doc.createdAt)}`
      : `Date d'émission : ${formatDateFR(doc.issuedAt ?? doc.createdAt)}`,
    right,
    y,
    regular,
    9,
    MUTED,
  );
  y -= 12;
  drawRight(
    page,
    isQuote
      ? `Valable jusqu'au ${formatDateFR(doc.validUntil)}`
      : `Échéance : ${formatDateFR(doc.dueAt)}`,
    right,
    y,
    regular,
    9,
    MUTED,
  );

  // ---- Parties
  y -= 34;
  const topParties = y;
  draw(page, "ÉMETTEUR", M, y, bold, 8, MUTED);
  y -= 14;
  draw(page, settings.legalName || "Skale Visuals", M, y, bold, 10);
  y -= 13;
  for (const l of [
    ...(settings.address ? settings.address.split("\n") : []),
    settings.email,
    settings.phone,
    settings.siret ? `SIRET : ${settings.siret}` : "",
    settings.vatNumber,
  ].filter(Boolean)) {
    for (const w of wrap(String(l), regular, 9, 220)) {
      draw(page, w, M, y, regular, 9, MUTED);
      y -= 12;
    }
  }

  let yr = topParties;
  const cx = W / 2 + 10;
  draw(page, "CLIENT", cx, yr, bold, 8, MUTED);
  yr -= 14;
  draw(page, doc.client.name || "—", cx, yr, bold, 10);
  yr -= 13;
  for (const l of [doc.client.company, doc.client.address, doc.client.email].filter(Boolean)) {
    for (const w of wrap(String(l), regular, 9, 200)) {
      draw(page, w, cx, yr, regular, 9, MUTED);
      yr -= 12;
    }
  }

  y = Math.min(y, yr) - 26;

  // ---- Lines table
  const colQty = 330;
  const colPu = 400;
  const colTva = 465;
  page.drawRectangle({ x: M, y: y - 6, width: right - M, height: 22, color: rgb(0.97, 0.97, 0.98) });
  draw(page, "DÉSIGNATION", M + 8, y, bold, 8, MUTED);
  draw(page, "QTÉ", colQty, y, bold, 8, MUTED);
  draw(page, "PU HT", colPu, y, bold, 8, MUTED);
  draw(page, "TVA", colTva, y, bold, 8, MUTED);
  drawRight(page, "TOTAL HT", right - 8, y, bold, 8, MUTED);
  y -= 26;

  const ensureSpace = (needed: number) => {
    if (y - needed > M + 60) return;
    page = pdf.addPage(A4);
    y = A4[1] - M;
  };

  for (const line of doc.lines) {
    const wrapped = wrap(line.label, regular, 10, colQty - M - 16);
    ensureSpace(wrapped.length * 13 + 10);
    const startY = y;
    for (const w of wrapped) {
      draw(page, w, M + 8, y, regular, 10);
      y -= 13;
    }
    draw(page, String(line.quantity), colQty, startY, regular, 10);
    draw(page, formatEUR(line.unit_price_ht), colPu, startY, regular, 10);
    draw(page, `${line.tva_rate}%`, colTva, startY, regular, 10);
    drawRight(page, formatEUR(lineTotals(line).ht), right - 8, startY, regular, 10);
    y -= 6;
    page.drawLine({
      start: { x: M, y: y + 4 },
      end: { x: right, y: y + 4 },
      thickness: 0.5,
      color: LINE,
    });
    y -= 8;
  }

  // ---- Totals
  const totals = docTotals(doc.lines);
  ensureSpace(90);
  y -= 6;
  const tx = right - 200;
  const rowTotal = (label: string, value: string, strong = false) => {
    draw(page, label, tx, y, strong ? bold : regular, strong ? 11 : 10, strong ? INK : MUTED);
    drawRight(page, value, right, y, strong ? bold : regular, strong ? 11 : 10);
    y -= strong ? 18 : 15;
  };
  rowTotal("Sous-total HT", formatEUR(totals.total_ht));
  rowTotal("TVA", formatEUR(totals.total_tva));
  page.drawLine({
    start: { x: tx, y: y + 8 },
    end: { x: right, y: y + 8 },
    thickness: 1,
    color: LINE,
  });
  y -= 6;
  rowTotal("Total TTC", formatEUR(totals.total_ttc), true);

  // ---- Notes / conditions
  const block = (title: string, body: string) => {
    if (!body?.trim()) return;
    const lines = wrap(body, regular, 9, right - M);
    ensureSpace(lines.length * 12 + 30);
    y -= 16;
    draw(page, title, M, y, bold, 8, MUTED);
    y -= 14;
    for (const l of lines) {
      draw(page, l, M, y, regular, 9, MUTED);
      y -= 12;
    }
  };
  block("NOTES", doc.notes ?? "");
  block(isQuote ? "CONDITIONS" : "CONDITIONS DE PAIEMENT", doc.conditions ?? settings.paymentTerms);

  if (!isQuote) {
    block(
      "RÈGLEMENT PAR VIREMENT",
      [settings.iban ? `IBAN : ${settings.iban}` : "", settings.bic ? `BIC : ${settings.bic}` : ""]
        .filter(Boolean)
        .join("\n"),
    );
    block("MENTIONS LÉGALES", settings.legalMentions);
  }

  // ---- Signature area (quotes only)
  if (isQuote) {
    ensureSpace(150);
    y -= 30;
    draw(page, "Bon pour accord", M, y, italic, 11);
    y -= 12;
    const boxH = 96;
    const boxW = 250;
    const boxY = y - boxH;
    page.drawRectangle({
      x: M,
      y: boxY,
      width: boxW,
      height: boxH,
      borderColor: LINE,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    draw(page, "Signature du client", M + 8, boxY + boxH - 16, regular, 8, MUTED);
    draw(page, `Date : ${formatDateFR(doc.signature?.signedAt ?? new Date().toISOString())}`, M + boxW + 20, boxY + boxH - 16, regular, 9, MUTED);

    if (doc.signature?.dataUrl?.startsWith("data:image/png;base64,")) {
      try {
        const img = await pdf.embedPng(doc.signature.dataUrl);
        const maxW = boxW - 30;
        const maxH = boxH - 34;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        page.drawImage(img, {
          x: M + 15,
          y: boxY + 14,
          width: img.width * scale,
          height: img.height * scale,
        });
      } catch {
        /* ignore */
      }
    } else if (doc.signature?.name) {
      draw(page, doc.signature.name, M + 20, boxY + boxH / 2 - 8, italic, 20, ACCENT);
    }

    if (doc.signature?.signedAt) {
      draw(
        page,
        `Signé électroniquement par ${doc.signature.name ?? ""} le ${formatDateFR(
          doc.signature.signedAt,
        )} à ${new Date(doc.signature.signedAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        M,
        boxY - 14,
        regular,
        8,
        MUTED,
      );
    }
  }

  // ---- Footer on every page
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: M, y: M + 24 },
      end: { x: right, y: M + 24 },
      thickness: 0.5,
      color: LINE,
    });
    draw(
      p,
      `${settings.legalName || "Skale Visuals"}${settings.siret ? ` · SIRET ${settings.siret}` : ""}`,
      M,
      M + 10,
      regular,
      7.5,
      MUTED,
    );
    drawRight(p, `Page ${i + 1}/${pages.length}`, right, M + 10, regular, 7.5, MUTED);
  });

  return await pdf.save();
}
