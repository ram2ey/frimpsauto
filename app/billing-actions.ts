"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { amountFromForm, positiveInt, text } from "@/lib/format";

export async function ensureInvoice(jobId: string) {
  await assertRole([Role.FINANCE]);
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found.");
  const invoice = await db.invoice.upsert({ where: { jobId }, create: { jobId }, update: {} });
  redirect(`/finance/invoices/${invoice.id}`);
}

export async function addLabor(invoiceId: string, form: FormData) {
  await assertRole([Role.FINANCE]);
  const description = text(form.get("description"), "Description", 250);
  const quantity = positiveInt(form.get("quantity"), "Quantity");
  const unitCents = amountFromForm(form.get("price"));
  await db.$transaction(async tx => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited.");
    await tx.invoiceItem.create({ data: { invoiceId, type: "LABOR", description, quantity, unitCents } });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/finance/invoices/${invoiceId}`);
  revalidatePath("/finance");
}

export async function removeLabor(itemId: string) {
  await assertRole([Role.FINANCE]);
  const item = await db.$transaction(async tx => {
    const found = await tx.invoiceItem.findUnique({ where: { id: itemId }, include: { invoice: true } });
    if (!found || found.type !== "LABOR" || found.invoice.status !== "DRAFT") throw new Error("This invoice line cannot be removed.");
    await tx.invoiceItem.delete({ where: { id: itemId } });
    return found;
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/finance/invoices/${item.invoiceId}`);
}

export async function issueInvoice(invoiceId: string) {
  await assertRole([Role.FINANCE]);
  await db.$transaction(async tx => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { job: true, items: true } });
    if (!invoice || invoice.status !== "DRAFT") throw new Error("Invoice is not a draft.");
    if (invoice.job.status !== "COMPLETED") throw new Error("The supervisor must close the job before the invoice is issued.");
    if (!invoice.items.length) throw new Error("Add a part or labor line before issuing the invoice.");
    await tx.invoice.update({ where: { id: invoiceId }, data: { status: "ISSUED", issuedAt: new Date() } });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/finance/invoices/${invoiceId}`);
  revalidatePath("/finance");
}

export async function recordPayment(invoiceId: string, form: FormData) {
  await assertRole([Role.FINANCE]);
  const amountCents = amountFromForm(form.get("amount"));
  if (amountCents <= 0) throw new Error("Payment must be greater than zero.");
  const method = text(form.get("method"), "Payment method", 50);
  await db.$transaction(async tx => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { items: true, payments: true } });
    if (!invoice || invoice.status === "DRAFT") throw new Error("Issue the invoice before recording payment.");
    const total = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    if (paid + amountCents > total) throw new Error("Payment exceeds the balance due.");
    await tx.payment.create({ data: { invoiceId, amountCents, method, reference: String(form.get("reference") || "").trim().slice(0, 100) || null } });
    await tx.invoice.update({ where: { id: invoiceId }, data: { status: paid + amountCents === total ? "PAID" : "PARTIAL" } });
  }, { isolationLevel: "Serializable" });
  revalidatePath(`/finance/invoices/${invoiceId}`);
  revalidatePath("/finance");
}
