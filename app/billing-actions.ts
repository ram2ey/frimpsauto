"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Location, Role } from "@/generated/prisma/client";
import { formAction, resultAction, serializable } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { amountFromForm, positiveInt, text } from "@/lib/format";

export async function ensureInvoice(jobId: string) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) throw new UserError("Job not found.");
    const invoice = await db.invoice.upsert({ where: { jobId }, create: { jobId }, update: {} });
    redirect(`/finance/invoices/${invoice.id}`);
  });
}

export async function addLabor(invoiceId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    const description = text(form.get("description"), "Description", 250);
    const quantity = positiveInt(form.get("quantity"), "Quantity");
    const unitCents = amountFromForm(form.get("price"));
    await serializable(async tx => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice || invoice.status !== "DRAFT") throw new UserError("Only draft invoices can be edited.");
      await tx.invoiceItem.create({ data: { invoiceId, type: "LABOR", description, quantity, unitCents } });
    });
    revalidatePath(`/finance/invoices/${invoiceId}`);
    revalidatePath("/finance");
  });
}

export async function updateLabor(itemId: string, form: FormData) {
  return resultAction(async () => {
    await assertRole([Role.FINANCE]);
    const description = text(form.get("description"), "Description", 250);
    const quantity = positiveInt(form.get("quantity"), "Quantity");
    const unitCents = amountFromForm(form.get("price"));
    const item = await serializable(async tx => {
      const found = await tx.invoiceItem.findUnique({ where: { id: itemId }, include: { invoice: true } });
      if (!found || found.type !== "LABOR" || found.invoice.status !== "DRAFT") throw new UserError("This labor line cannot be edited.");
      await tx.invoiceItem.update({ where: { id: itemId }, data: { description, quantity, unitCents } });
      return found;
    });
    revalidatePath(`/finance/invoices/${item.invoiceId}`);
    revalidatePath("/finance");
  });
}

export async function removeLabor(itemId: string) {
  return resultAction(async () => {
    await assertRole([Role.FINANCE]);
    const item = await serializable(async tx => {
      const found = await tx.invoiceItem.findUnique({ where: { id: itemId }, include: { invoice: true } });
      if (!found || found.type !== "LABOR" || found.invoice.status !== "DRAFT") throw new UserError("This invoice line cannot be removed.");
      await tx.invoiceItem.delete({ where: { id: itemId } });
      return found;
    });
    revalidatePath(`/finance/invoices/${item.invoiceId}`);
  });
}

export async function updatePartItem(itemId: string, form: FormData) {
  return resultAction(async () => {
    const actor = await assertRole([Role.ADMIN]);
    const newQty = positiveInt(form.get("quantity"), "Quantity");
    const unitCents = amountFromForm(form.get("price"));
    const description = text(form.get("description"), "Description", 250);
    const reason = String(form.get("reason") || "").trim().slice(0, 300) || "Admin invoice adjustment";

    const item = await serializable(async tx => {
      const found = await tx.invoiceItem.findUnique({
        where: { id: itemId },
        include: { invoice: { include: { job: true } } },
      });
      if (!found || found.type !== "PART" || found.invoice.status !== "DRAFT") {
        throw new UserError("Only parts on draft invoices can be edited by an admin.");
      }

      if (found.requestId) {
        const partRequest = await tx.partRequest.findUnique({
          where: { id: found.requestId },
          include: { part: true },
        });
        if (partRequest) {
          const delta = found.quantity - newQty; // positive: returning items; negative: taking more
          if (delta > 0) {
            // Returning delta items back to inventory stock
            await tx.part.update({
              where: { id: partRequest.partId },
              data: { stockQty: { increment: delta } },
            });
            await tx.stockMovement.create({
              data: {
                partId: partRequest.partId,
                userId: actor.id,
                location: Location.WORKSHOP,
                delta,
                reason: `Returned from Job #${found.invoice.job.number} (INV-${String(found.invoice.number).padStart(5, "0")}): ${reason}`,
              },
            });
            await tx.partRequest.update({
              where: { id: partRequest.id },
              data: { issuedQty: newQty },
            });
          } else if (delta < 0) {
            // Additional quantity needed from stock
            const additional = -delta;
            const updated = await tx.part.updateMany({
              where: { id: partRequest.partId, stockQty: { gte: additional } },
              data: { stockQty: { decrement: additional } },
            });
            if (!updated.count) {
              throw new UserError(`Insufficient stock. Only ${partRequest.part.stockQty} units available.`);
            }
            await tx.stockMovement.create({
              data: {
                partId: partRequest.partId,
                userId: actor.id,
                location: Location.WORKSHOP,
                delta: -additional,
                reason: `Additional units issued to Job #${found.invoice.job.number} (INV-${String(found.invoice.number).padStart(5, "0")}): ${reason}`,
              },
            });
            await tx.partRequest.update({
              where: { id: partRequest.id },
              data: { issuedQty: newQty },
            });
          }
        }
      }

      await tx.invoiceItem.update({
        where: { id: itemId },
        data: { description, quantity: newQty, unitCents },
      });

      return found;
    });

    revalidatePath(`/finance/invoices/${item.invoiceId}`);
    revalidatePath("/finance");
    revalidatePath("/inventory");
  });
}

export async function returnPartItem(itemId: string, form?: FormData) {
  return resultAction(async () => {
    const actor = await assertRole([Role.ADMIN]);
    const reason = form ? String(form.get("reason") || "").trim().slice(0, 300) : "";

    const item = await serializable(async tx => {
      const found = await tx.invoiceItem.findUnique({
        where: { id: itemId },
        include: { invoice: { include: { job: true } } },
      });
      if (!found || found.type !== "PART" || found.invoice.status !== "DRAFT") {
        throw new UserError("Only parts on draft invoices can be returned by an admin.");
      }

      if (found.requestId) {
        const partRequest = await tx.partRequest.findUnique({
          where: { id: found.requestId },
        });
        if (partRequest) {
          // Return full quantity back to stock
          await tx.part.update({
            where: { id: partRequest.partId },
            data: { stockQty: { increment: found.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              partId: partRequest.partId,
              userId: actor.id,
              location: Location.WORKSHOP,
              delta: found.quantity,
              reason: `Returned to stock from Job #${found.invoice.job.number} (INV-${String(found.invoice.number).padStart(5, "0")})${reason ? `: ${reason}` : ""}`,
            },
          });
          await tx.partRequest.update({
            where: { id: partRequest.id },
            data: {
              issuedQty: 0,
              status: "REJECTED",
              decisionNote: `Returned to stock by admin: ${reason || "Removed from invoice"}`,
            },
          });
        }
      }

      await tx.invoiceItem.delete({ where: { id: itemId } });
      return found;
    });

    revalidatePath(`/finance/invoices/${item.invoiceId}`);
    revalidatePath("/finance");
    revalidatePath("/inventory");
    revalidatePath(`/jobs/${item.invoice.jobId}`);
  });
}

export async function issueInvoice(invoiceId: string) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    await serializable(async tx => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { job: true, items: true } });
      if (!invoice || invoice.status !== "DRAFT") throw new UserError("Invoice is not a draft.");
      if (invoice.job.status !== "COMPLETED") throw new UserError("The supervisor must close the job before the invoice is issued.");
      if (!invoice.items.length) throw new UserError("Add a part or labor line before issuing the invoice.");
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: "ISSUED", issuedAt: new Date() } });
    });
    revalidatePath(`/finance/invoices/${invoiceId}`);
    revalidatePath("/finance");
  });
}

export async function recordPayment(invoiceId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    const amountCents = amountFromForm(form.get("amount"));
    if (amountCents <= 0) throw new UserError("Payment must be greater than zero.");
    const method = text(form.get("method"), "Payment method", 50);
    await serializable(async tx => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { items: true, payments: true } });
      if (!invoice || invoice.status === "DRAFT") throw new UserError("Issue the invoice before recording payment.");
      const total = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
      const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
      if (paid + amountCents > total) throw new UserError("Payment exceeds the balance due.");
      await tx.payment.create({ data: { invoiceId, amountCents, method, reference: String(form.get("reference") || "").trim().slice(0, 100) || null } });
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: paid + amountCents === total ? "PAID" : "PARTIAL" } });
    });
    revalidatePath(`/finance/invoices/${invoiceId}`);
    revalidatePath("/finance");
  });
}
