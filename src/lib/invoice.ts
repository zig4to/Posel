// Račun: podatki izdajatelja, oštevilčenje in HTML za tisk/shranjevanje v PDF.

import { formatEUR } from "@/lib/utils/currency";

/** Podatki izdajatelja (glava računa desno zgoraj). */
export const INVOICE_ISSUER = {
  name: "Montaža na Terenu, Žiga Tomše s.p",
  lines: ["Zgornje Bitnje 318", "4209 Žabnica"],
  taxId: "15869369",
  iban: "SI56 0284 3026 6671 416",
  place: "Kranj",
};

/** Privzeti rok plačila v dneh od datuma izdaje. */
export const INVOICE_DUE_DAYS = 14;

export const INVOICE_VAT_NOTE =
  "DDV ni obračunan na podlagi 1. odstavka 94. člena Zakona o davku na dodano vrednost.";

export type InvoiceItem = { description: string; amount: number };

export type InvoiceData = {
  number: string; // "26-018"
  issueDate: string; // "YYYY-MM-DD"
  place: string;
  serviceFrom: string;
  serviceTo: string;
  dueDate: string;
  buyer: string; // več vrstic
  buyerVatId: string;
  items: InvoiceItem[];
};

// --- Oštevilčenje (zadnja številka je shranjena v brskalniku) ---

const LAST_NUMBER_KEY = "posel:invoice:last-number";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // zasebno okno ipd. - brez pomnjenja
  }
}

/** Naslednja številka "LL-NNN"; z novim letom začne znova pri 001. */
export function nextInvoiceNumber(today: Date = new Date()): string {
  const yy = String(today.getFullYear() % 100).padStart(2, "0");
  const match = readStorage(LAST_NUMBER_KEY)?.match(/^(\d{2})-(\d+)$/);
  const next = match && match[1] === yy ? Number(match[2]) + 1 : 1;
  return `${yy}-${String(next).padStart(3, "0")}`;
}

export function rememberInvoiceNumber(number: string) {
  writeStorage(LAST_NUMBER_KEY, number.trim());
}

/** Zapomnjeni podatki kupca (naslov, ID za DDV) za posameznega partnerja. */
export function readBuyerMemory(clientId: string): { buyer: string | null; vatId: string | null } {
  return {
    buyer: readStorage(`posel:invoice:buyer:${clientId}`),
    vatId: readStorage(`posel:invoice:vat:${clientId}`),
  };
}

export function rememberBuyer(clientId: string, buyer: string, vatId: string) {
  writeStorage(`posel:invoice:buyer:${clientId}`, buyer);
  writeStorage(`posel:invoice:vat:${clientId}`, vatId);
}

// --- Oblikovanje ---

/** "YYYY-MM-DD" -> "12.11.2026" */
export function formatInvoiceDate(dateKey: string): string {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-");
  return `${d}.${m}.${y}`;
}

/** Sklic: "SI00 " + številka brez pomišljaja ("26-018" -> "SI00 26018"). */
export function invoiceReference(number: string): string {
  return `SI00 ${number.replace(/[^0-9]/g, "")}`;
}

export function invoiceFileName(number: string): string {
  return `racun_${number.trim().replace(/[^0-9A-Za-z-]/g, "_")}`;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lines(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(esc)
    .join("<br>");
}

/** Celoten HTML dokument računa (A4) za tisk oz. "Shrani kot PDF". */
export function buildInvoiceHtml(data: InvoiceData): string {
  const total = data.items.reduce((sum, item) => sum + item.amount, 0);
  const service =
    data.serviceFrom === data.serviceTo || !data.serviceTo
      ? formatInvoiceDate(data.serviceFrom)
      : `${formatInvoiceDate(data.serviceFrom)} - ${formatInvoiceDate(data.serviceTo)}`;

  const rows = data.items
    .map(
      (item) => `<tr>
        <td>${esc(item.description)}</td>
        <td class="r">${esc(formatEUR(item.amount))}</td>
        <td class="r">1</td>
        <td class="r">€</td>
        <td class="r">${esc(formatEUR(item.amount))}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="sl">
<head>
<meta charset="utf-8">
<title>${esc(invoiceFileName(data.number))}</title>
<style>
  @page { size: A4; margin: 18mm 20mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; color: #111; }
  body { font-family: "Open Sans", "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.3; }
  .head { display: flex; justify-content: space-between; gap: 16mm; }
  .head > div { flex: 1; }
  .issuer { border-left: 1px solid #555; padding-left: 3mm; }
  b { font-weight: 700; }
  .buyer { margin-top: 26mm; }
  .vat { margin-top: 12mm; }
  table { width: 100%; border-collapse: collapse; margin-top: 10mm; }
  th { font-weight: 400; text-align: left; padding: 1mm 1.5mm; border-bottom: 1px solid #888; }
  td { padding: 1mm 1.5mm; vertical-align: top; }
  tbody tr:last-child td { border-bottom: 1px solid #888; }
  .r { text-align: right; white-space: nowrap; }
  .sum td { padding-top: 1.2mm; }
  .pay td { font-weight: 700; }
  .pay td.amount { border-bottom: 2px solid #888; }
  .notes { margin-top: 10mm; }
  .notes p { margin: 0 0 4mm; }
  .stamp { margin-top: 10mm; padding-left: 68%; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <b>Račun št.: ${esc(data.number)}</b><br>
      Datum izdaje: ${esc(data.place ? `${data.place}, ` : "")}${esc(formatInvoiceDate(data.issueDate))}<br>
      Datum opr. storitve: ${esc(service)}<br>
      Rok plačila: ${esc(formatInvoiceDate(data.dueDate))}
    </div>
    <div class="issuer">
      <b>${esc(INVOICE_ISSUER.name)}</b><br>
      ${INVOICE_ISSUER.lines.map(esc).join("<br>")}<br>
      Davčna št.: ${esc(INVOICE_ISSUER.taxId)}<br>
      IBAN št.: ${esc(INVOICE_ISSUER.iban)}
    </div>
  </div>

  <div class="buyer">${lines(data.buyer)}</div>
  ${data.buyerVatId.trim() ? `<div class="vat">ID za DDV kupca: ${esc(data.buyerVatId.trim())}</div>` : ""}

  <table>
    <thead>
      <tr>
        <th>Opis</th>
        <th class="r">Cena</th>
        <th class="r">Količina</th>
        <th class="r">Enota</th>
        <th class="r">Znesek</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="sum"><td colspan="4" class="r">Skupaj</td><td class="r">${esc(formatEUR(total))}</td></tr>
      <tr class="pay"><td colspan="4" class="r">Za plačilo</td><td class="r amount">${esc(formatEUR(total))}</td></tr>
    </tfoot>
  </table>

  <div class="notes">
    <p>Pri plačilu se sklicujte na številko ${esc(invoiceReference(data.number))}.</p>
    <p>Prosimo, da račun poravnate do valute plačila.</p>
    <p>${esc(INVOICE_VAT_NOTE)}</p>
  </div>

  <div class="stamp">Žig:</div>
</body>
</html>`;
}

/**
 * Odpre sistemski dialog za tisk s skritim iframe-om; tam izbereš
 * "Shrani kot PDF". Ime datoteke je privzeto naslov dokumenta (racun_26-018).
 */
export function printInvoice(data: InvoiceData) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(buildInvoiceHtml(data));
  doc.close();

  // Nekateri brskalniki za ime PDF-ja vzamejo naslov glavnega dokumenta.
  const prevTitle = document.title;
  document.title = invoiceFileName(data.number);
  const cleanup = () => {
    document.title = prevTitle;
    setTimeout(() => iframe.remove(), 500);
  };
  win.addEventListener("afterprint", cleanup, { once: true });

  setTimeout(() => {
    win.focus();
    win.print();
    // Rezerva, če "afterprint" ne pride (npr. nekateri mobilni brskalniki).
    setTimeout(() => {
      if (document.title !== prevTitle) document.title = prevTitle;
    }, 60_000);
  }, 50);
}
