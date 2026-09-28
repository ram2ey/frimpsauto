import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createInvoicePdf } from "@/lib/invoice-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.FINANCE]);
  const { id } = await params;
  const [invoice, business] = await Promise.all([db.invoice.findUnique({ where: { id }, include: {
    job: { include: { customer: true, vehicle: { include: { model: true } } } },
    items: { orderBy: { createdAt: "asc" } },
    payments: { orderBy: { paidAt: "asc" } },
  } }), db.businessProfile.findUnique({ where: { id: "primary" } })]);
  if (!invoice) return new Response("Invoice not found", { status: 404 });
  const pdf = await createInvoicePdf(invoice, business);
  const filename = `Frimps-Invoice-INV-${String(invoice.number).padStart(5, "0")}.pdf`;
  return new NextResponse(new Uint8Array(pdf), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(pdf.length),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
