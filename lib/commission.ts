import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/** "20%" or "12.5%" from basis points. */
export function ratePercent(bps: number | null | undefined) {
  return bps == null ? "—" : `${Number((bps / 100).toFixed(2))}%`;
}

export const commissionFor = (laborCents: number, rateBps: number) => Math.round((laborCents * rateBps) / 10000);

/**
 * Called when an invoice becomes fully paid. Fixes the assigned technician's share of
 * the LABOR lines at their current rate, so later rate changes don't alter it.
 * No record is made when the job has no technician, the technician has no rate, or there is no labour.
 */
export async function recordCommission(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, commission: true, job: { include: { technician: true } } },
  });
  if (!invoice || invoice.status !== "PAID" || invoice.commission) return;
  const technician = invoice.job.technician;
  if (!technician?.commissionBps) return;
  const laborCents = invoice.items.filter(item => item.type === "LABOR").reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
  if (laborCents <= 0) return;
  await tx.commission.create({
    data: {
      invoiceId,
      technicianId: technician.id,
      laborCents,
      rateBps: technician.commissionBps,
      amountCents: commissionFor(laborCents, technician.commissionBps),
    },
  });
}
