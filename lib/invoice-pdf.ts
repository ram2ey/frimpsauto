import { readFile } from "node:fs/promises";
import path from "node:path";
import { paymentMethods } from "@/lib/payment-details";

type JobForPdf = {
  number: number;
  mileage: number | null;
  customer: { name: string; phone: string; email: string | null };
  vehicle: { year: number; model: { name: string } | null; customModel: string | null; vin: string | null; plate: string | null };
};
type ItemForPdf = { type: string; description: string; quantity: number; unitCents: number };
type PaymentForPdf = { amountCents: number; paidAt: Date; method: string; reference: string | null; isDeposit?: boolean };
type InvoiceForPdf = {
  number: number;
  status: string;
  createdAt: Date;
  issuedAt: Date | null;
  job: JobForPdf;
  items: ItemForPdf[];
  payments: PaymentForPdf[];
};
type ProformaForPdf = {
  number: number;
  revision: number;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  validUntil: Date | null;
  notes: string | null;
  job: JobForPdf;
  items: ItemForPdf[];
};

/** What the shared layout needs, whichever document it is printing. */
type DocumentForPdf = {
  title: string;
  reference: string;
  meta: string[];
  date: Date;
  job: JobForPdf;
  items: ItemForPdf[];
  payments: PaymentForPdf[];
  paymentsHeading: string;
  totalLabel: string;
  paidLabel: string;
  balanceLabel: string;
  notes?: string | null;
  disclaimer?: string;
};

export const invoiceReference = (number: number) => `INV-${String(number).padStart(5, "0")}`;
export const proformaReference = (number: number, revision = 1) => `PF-${String(number).padStart(5, "0")}${revision > 1 ? ` Rev ${revision}` : ""}`;
type BusinessForPdf = ({ name: string; address: string | null; phone: string | null; email: string | null } & Parameters<typeof paymentMethods>[0]) | null;

const money = (cents: number) => `GHS ${(cents / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
const win1252: Record<string, number> = { "€": 128, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151, "™": 153 };
function latin(value: string) {
  return [...value.normalize("NFC")].map(char => {
    const code = char.charCodeAt(0);
    return code < 32 ? " " : code <= 255 ? char : String.fromCharCode(win1252[char] ?? 63);
  }).join("");
}
function pdfText(value: string) {
  return latin(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll("\r", " ").replaceAll("\n", " ");
}
function jpegSize(bytes: Buffer) {
  if (bytes.readUInt16BE(0) !== 0xffd8) throw new Error("Logo must be a JPEG.");
  let offset = 2;
  while (offset < bytes.length - 9) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) { offset += 2; continue; }
    const size = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    offset += 2 + size;
  }
  throw new Error("Cannot read logo dimensions.");
}
function wrap(value: string, limit: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of value.trim().split(/\s+/)) {
    if (line && `${line} ${word}`.length > limit) { lines.push(line); line = ""; }
    if (word.length > limit) {
      if (line) { lines.push(line); line = ""; }
      for (let i = 0; i < word.length; i += limit) lines.push(word.slice(i, i + limit));
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function createInvoicePdf(invoice: InvoiceForPdf, business: BusinessForPdf = null) {
  return createDocumentPdf({
    title: "INVOICE",
    reference: invoiceReference(invoice.number),
    meta: [`Status: ${invoice.status.toLowerCase()}`],
    date: invoice.issuedAt || invoice.createdAt,
    job: invoice.job,
    items: invoice.items,
    payments: invoice.payments,
    paymentsHeading: "PAYMENTS",
    totalLabel: "Total",
    paidLabel: "Paid",
    balanceLabel: "Balance due",
  }, business);
}

export function createProformaPdf(proforma: ProformaForPdf, deposits: PaymentForPdf[], business: BusinessForPdf = null) {
  return createDocumentPdf({
    title: "PROFORMA INVOICE",
    reference: proformaReference(proforma.number, proforma.revision),
    meta: proforma.validUntil ? [`Valid until: ${date(proforma.validUntil)}`] : [],
    date: proforma.sentAt || proforma.createdAt,
    job: proforma.job,
    items: proforma.items,
    payments: deposits,
    paymentsHeading: "DEPOSITS RECEIVED",
    totalLabel: "Estimated total",
    paidLabel: "Deposit paid",
    balanceLabel: "Balance",
    notes: proforma.notes,
    disclaimer: "This proforma invoice is an estimate, not a demand for payment. The final invoice may differ if further faults are found during the work.",
  }, business);
}

async function createDocumentPdf(doc: DocumentForPdf, business: BusinessForPdf): Promise<Buffer> {
  const logo = await readFile(path.join(process.cwd(), "public", "frimps-logo.jpeg"));
  const logoSize = jpegSize(logo);
  const objects: Buffer[] = [];
  const add = (body: string | Buffer = "") => { objects.push(typeof body === "string" ? Buffer.from(body, "latin1") : body); return objects.length; };
  const set = (id: number, body: string | Buffer) => { objects[id - 1] = typeof body === "string" ? Buffer.from(body, "latin1") : body; };
  const stream = (data: Buffer, dictionary = "") => Buffer.concat([Buffer.from(`<< /Length ${data.length}${dictionary} >>\nstream\n`, "ascii"), data, Buffer.from("\nendstream", "ascii")]);
  const catalogId = add();
  const pagesId = add();
  const regularId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const imageId = add();
  set(imageId, stream(logo, ` /Type /XObject /Subtype /Image /Width ${logoSize.width} /Height ${logoSize.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`));

  const pageIds: number[] = [];
  const pageCommands: string[][] = [];
  let commands: string[] = [];
  let y = 0;
  const line = (x1: number, top1: number, x2: number, top2: number, color = "0.78 0.84 0.89") => commands.push(`${color} RG 0.7 w ${x1} ${842 - top1} m ${x2} ${842 - top2} l S`);
  const rect = (x: number, top: number, width: number, height: number, color: string) => commands.push(`${color} rg ${x} ${842 - top - height} ${width} ${height} re f`);
  const write = (value: string, x: number, top: number, size = 10, bold = false, color = "0.10 0.20 0.29") => commands.push(`${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${842 - top} Tm (${pdfText(value)}) Tj ET`);
  const right = (value: string, rightX: number, top: number, size = 10, bold = false) => {
    const width = latin(value).length * size * (bold ? 0.55 : 0.51);
    write(value, rightX - width, top, size, bold);
  };
  const startPage = () => {
    if (pageIds.length) pageCommands.push(commands);
    const pageId = add();
    pageIds.push(pageId);
    commands = [];
    rect(0, 0, 595, 7, "0.03 0.38 0.63");
    commands.push("q 88 0 0 88 42 731 cm /Logo Do Q");
    const nameLines = wrap(business?.name || "Frimps MB Autoboss", 48);
    nameLines.forEach((value, index) => write(value, 145, 52 + index * 17, 14, true));
    const contacts = [business?.address, business?.phone, business?.email].map(value => value?.trim()).filter(Boolean) as string[];
    const contactLines = contacts.flatMap(value => wrap(value, 85));
    const contactTop = 72 + (nameLines.length - 1) * 17;
    contactLines.forEach((value, index) => write(value, 145, contactTop + index * 12, 8));
    const headerBottom = Math.max(122, contactTop + contactLines.length * 12 + 8);
    line(42, headerBottom, 553, headerBottom);
    y = headerBottom + 24;
  };
  const room = (height: number) => { if (y + height > 770) startPage(); };
  startPage();
  const { job } = doc;
  const invoiceNumber = doc.reference;
  write(doc.title, 42, y, 20, true);
  right(invoiceNumber, 553, y, 13, true);
  y += 24;
  write(doc.meta.join("   ·   "), 42, y, 9);
  right(`Date: ${date(doc.date)}`, 553, y, 9);
  y += 28;
  const customerLines = [
    ...wrap(job.customer.name, 38),
    ...wrap(job.customer.phone, 38),
    ...(job.customer.email ? wrap(job.customer.email, 38) : []),
  ];
  const vehicleLines = [
    `Job #${String(job.number).padStart(5, "0")}`,
    ...wrap(`${job.vehicle.year} Mercedes-Benz ${job.vehicle.model?.name || job.vehicle.customModel || ""}`, 41),
    ...[job.vehicle.plate && `Plate: ${job.vehicle.plate}`, job.vehicle.vin && `VIN: ${job.vehicle.vin}`].filter((value): value is string => Boolean(value)),
    ...(job.mileage !== null ? [`Mileage: ${job.mileage.toLocaleString("en-GH")}`] : []),
  ];
  const boxHeight = Math.max(92, 44 + Math.max(customerLines.length, vehicleLines.length) * 14);
  rect(42, y - 12, 511, boxHeight, "0.94 0.97 0.99");
  write("BILL TO", 54, y + 3, 8, true);
  customerLines.forEach((value, index) => write(value, 54, y + 23 + index * 14, index === 0 ? 10 : 9, index === 0));
  write("JOB / VEHICLE", 305, y + 3, 8, true);
  vehicleLines.forEach((value, index) => write(value, 305, y + 23 + index * 14, 9));
  y += boxHeight + 16;

  const tableHead = () => {
    room(45);
    rect(42, y - 12, 511, 25, "0.89 0.94 0.98");
    write("DESCRIPTION", 50, y + 4, 8, true);
    right("QTY", 393, y + 4, 8, true);
    right("UNIT", 464, y + 4, 8, true);
    right("AMOUNT", 545, y + 4, 8, true);
    y += 32;
  };
  tableHead();
  for (const item of doc.items) {
    const lines = wrap(item.description, 48);
    const height = Math.max(32, lines.length * 13 + 16);
    if (y + height > 755) { startPage(); tableHead(); }
    lines.forEach((value, index) => write(value, 50, y + index * 13, 9));
    write(item.type.toLowerCase(), 50, y + lines.length * 13, 7, false, "0.36 0.46 0.54");
    right(String(item.quantity), 393, y, 9);
    right(money(item.unitCents), 464, y, 9);
    right(money(item.quantity * item.unitCents), 545, y, 9, true);
    y += height;
    line(42, y - 12, 553, y - 12);
  }
  if (!doc.items.length) { write("No charges yet", 50, y + 4, 9); y += 35; }
  const total = doc.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
  const paid = doc.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  room(100);
  y += 16;
  write(doc.totalLabel, 370, y, 10, true); right(money(total), 545, y, 10, true);
  y += 22;
  write(doc.paidLabel, 370, y, 10); right(money(paid), 545, y, 10);
  y += 22;
  line(362, y - 10, 553, y - 10);
  write(doc.balanceLabel, 370, y + 5, 11, true); right(money(total - paid), 545, y + 5, 11, true);
  y += 39;
  if (doc.notes?.trim()) {
    const noteLines = doc.notes.split(/\r?\n/).flatMap(value => (value.trim() ? wrap(value, 100) : [""]));
    room(30 + noteLines.length * 12);
    write("NOTES", 42, y, 9, true);
    y += 16;
    for (const value of noteLines) { room(14); write(value, 42, y, 9); y += 12; }
    y += 16;
  }
  if (doc.disclaimer) {
    const disclaimerLines = wrap(doc.disclaimer, 110);
    room(disclaimerLines.length * 11 + 20);
    disclaimerLines.forEach((value, index) => write(value, 42, y + index * 11, 8, false, "0.36 0.46 0.54"));
    y += disclaimerLines.length * 11 + 20;
  }
  const methods = total - paid > 0 ? paymentMethods(business) : [];
  if (methods.length) {
    // Long values (e.g. two account holder names) wrap within their column.
    // Alternative names written "A / B" break at the slash first.
    const wrapValue = (value: string) => value.split(/\s+\/\s+/).flatMap((part, index, parts) => wrap(index < parts.length - 1 ? `${part} /` : part, 30));
    const laidOut = methods.slice(0, 2).map(method => method.lines.map(entry => ({ ...entry, wrapped: wrapValue(entry.value) })));
    const rows = Math.max(...laidOut.map(lines => lines.reduce((sum, entry) => sum + entry.wrapped.length, 0)));
    const height = 50 + rows * 13;
    room(height + 10);
    rect(42, y - 12, 511, height, "0.94 0.97 0.99");
    write("PAYMENT DETAILS", 54, y + 3, 8, true);
    methods.slice(0, 2).forEach((method, column) => {
      const x = column === 0 ? 54 : 305;
      write(method.title, x, y + 21, 9, true);
      let row = 0;
      laidOut[column].forEach(entry => {
        write(`${entry.label}:`, x, y + 36 + row * 13, 8, false, "0.36 0.46 0.54");
        entry.wrapped.forEach(part => {
          write(part, x + 82, y + 36 + row * 13, 9, entry.label.toLowerCase().includes("number"));
          row++;
        });
      });
    });
    y += height;
    write(`Please use ${invoiceNumber} as the payment reference.`, 42, y + 2, 8, false, "0.36 0.46 0.54");
    y += 24;
  }
  if (doc.payments.length) {
    room(45);
    write(doc.paymentsHeading, 42, y, 9, true);
    y += 18;
    for (const payment of doc.payments) {
      const detail = `${date(payment.paidAt)}  ·  ${payment.method}${payment.isDeposit ? " (deposit)" : ""}${payment.reference ? `  ·  ${payment.reference}` : ""}`;
      const detailLines = wrap(detail, 65);
      room(detailLines.length * 12 + 6);
      detailLines.forEach((value, index) => write(value, 42, y + index * 12, 8));
      right(money(payment.amountCents), 545, y, 8);
      y += Math.max(20, detailLines.length * 12 + 6);
    }
  }
  pageCommands.push(commands);
  for (let index = 0; index < pageIds.length; index++) {
    const content = pageCommands[index];
    content.push("0.42 0.51 0.59 RG 0.5 w 42 51 m 553 51 l S");
    content.push(`0.36 0.46 0.54 rg BT /F1 8 Tf 1 0 0 1 42 35 Tm (${pdfText(invoiceNumber)}) Tj ET`);
    content.push(`0.36 0.46 0.54 rg BT /F1 8 Tf 1 0 0 1 520 35 Tm (${index + 1} / ${pageIds.length}) Tj ET`);
    const contentId = add(stream(Buffer.from(content.join("\n"), "latin1")));
    set(pageIds[index], `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R >> /XObject << /Logo ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  }
  set(pagesId, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [0];
  let offset = chunks[0].length;
  objects.forEach((body, index) => {
    offsets.push(offset);
    const object = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`, "ascii"), body, Buffer.from("\nendobj\n", "ascii")]);
    chunks.push(object);
    offset += object.length;
  });
  const xref = offset;
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(value => `${String(value).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`, "ascii"));
  return Buffer.concat(chunks);
}
