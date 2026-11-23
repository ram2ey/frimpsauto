import { date, money } from "@/lib/format";

const DEFAULT_BUSINESS = "Frimps MB Autoboss";

export const invoiceFilename = (number: number) => `Frimps-Invoice-INV-${String(number).padStart(5, "0")}.pdf`;
export const proformaFilename = (number: number, revision: number) =>
  `Frimps-Proforma-PF-${String(number).padStart(5, "0")}${revision > 1 ? `-Rev${revision}` : ""}.pdf`;

export function invoiceShareText(business: string | null | undefined, number: number, totalCents: number, balanceCents: number) {
  const reference = `INV-${String(number).padStart(5, "0")}`;
  const amount = balanceCents > 0 ? `Balance due: ${money(balanceCents)} (total ${money(totalCents)}). Please use ${reference} as the payment reference.` : `Total ${money(totalCents)}, paid in full. Thank you.`;
  return `Invoice ${reference} from ${business || DEFAULT_BUSINESS}. ${amount}`;
}

export function proformaShareText(business: string | null | undefined, reference: string, totalCents: number, validUntil: Date | null) {
  return `Proforma invoice ${reference} from ${business || DEFAULT_BUSINESS}. Estimated total: ${money(totalCents)}${validUntil ? `, valid until ${date(validUntil)}` : ""}.`;
}
