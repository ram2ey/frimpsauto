import "server-only";
import { Location } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Invoice totals computed in the database, so they stay correct and fast however many invoices exist. */
export async function invoiceTotals() {
  const [billed, paid, paidOnIssued] = await Promise.all([
    db.$queryRaw<{ total: bigint | number | null }[]>`
      SELECT COALESCE(SUM(i."quantity"::bigint * i."unitCents"), 0) AS total
      FROM "InvoiceItem" i JOIN "Invoice" v ON v."id" = i."invoiceId"
      WHERE v."status" <> 'DRAFT'`,
    db.payment.aggregate({ _sum: { amountCents: true } }),
    // Deposits on draft invoices are money received, but nothing is billed against them yet.
    db.payment.aggregate({ where: { invoice: { status: { not: "DRAFT" } } }, _sum: { amountCents: true } }),
  ]);
  const billedCents = Number(billed[0]?.total ?? 0);
  const receivedCents = paid._sum.amountCents ?? 0;
  return { billedCents, receivedCents, outstandingCents: billedCents - (paidOnIssued._sum.amountCents ?? 0) };
}

/** All-time counter-sale revenue at a location (not just the recent rows a page lists). */
export async function counterSalesTotal(location: Location) {
  const result = await db.directSale.aggregate({ where: { location }, _sum: { totalCents: true } });
  return result._sum.totalCents ?? 0;
}

/** Counter sales since local midnight at a location. Ghana is on GMT all year. */
export async function counterSalesToday(location: Location) {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [sales, items] = await Promise.all([
    db.directSale.aggregate({ where: { location, createdAt: { gte: startOfDay } }, _sum: { totalCents: true }, _count: { _all: true } }),
    db.directSaleItem.aggregate({ where: { sale: { location, createdAt: { gte: startOfDay } } }, _sum: { quantity: true } }),
  ]);
  return { count: sales._count._all, revenueCents: sales._sum.totalCents ?? 0, itemsSold: items._sum.quantity ?? 0 };
}
