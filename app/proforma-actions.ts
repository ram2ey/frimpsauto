"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role, type Prisma } from "@/generated/prisma/client";
import { formAction, resultAction, serializable } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { amountFromForm, positiveInt, text } from "@/lib/format";

const DEFAULT_VALID_DAYS = 14;
const LINE_TYPES = ["PART", "LABOR", "ITEM"] as const;
type LineType = (typeof LINE_TYPES)[number];
const isLineType = (value: string): value is LineType => (LINE_TYPES as readonly string[]).includes(value);

function refresh(proformaId: string, jobId: string) {
  revalidatePath(`/finance/proformas/${proformaId}`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/finance");
}

/**
 * Any change to a proforma that has already gone to the customer reopens it as a
 * new revision, so the customer is never held to a quote they did not see.
 */
async function reopenForEdit(tx: Prisma.TransactionClient, proformaId: string) {
  const proforma = await tx.proforma.findUnique({ where: { id: proformaId } });
  if (!proforma) throw new UserError("Proforma not found.");
  if (proforma.status !== "DRAFT") {
    await tx.proforma.update({
      where: { id: proformaId },
      data: { status: "DRAFT", revision: { increment: 1 }, sentAt: null, decidedAt: null },
    });
  }
  return proforma;
}

export async function ensureProforma(jobId: string) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) throw new UserError("Job not found.");
    const validUntil = new Date(Date.now() + DEFAULT_VALID_DAYS * 24 * 60 * 60 * 1000);
    const proforma = await db.proforma.upsert({ where: { jobId }, create: { jobId, validUntil }, update: {} });
    redirect(`/finance/proformas/${proforma.id}`);
  });
}

export async function addProformaLine(proformaId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    const type = String(form.get("type") || "LABOR");
    if (!isLineType(type)) throw new UserError("Choose a valid line type.");
    const quantity = positiveInt(form.get("quantity"), "Quantity");
    let data: { type: LineType; partId: string | null; description: string; unitCents: number };
    if (type === "PART") {
      const part = await db.part.findUnique({ where: { id: String(form.get("partId") || "") } });
      if (!part || !part.active) throw new UserError("Choose a part from the catalogue.");
      // A blank price uses the catalogue price.
      const price = String(form.get("price") || "").trim();
      data = { type, partId: part.id, description: `${part.name} (${part.sku})`, unitCents: price ? amountFromForm(price) : part.priceCents };
    } else {
      data = { type, partId: null, description: text(form.get("description"), "Description", 250), unitCents: amountFromForm(form.get("price")) };
    }
    const proforma = await serializable(async tx => {
      const found = await reopenForEdit(tx, proformaId);
      await tx.proformaItem.create({ data: { proformaId, quantity, ...data } });
      return found;
    });
    refresh(proformaId, proforma.jobId);
  });
}

export async function updateProformaLine(itemId: string, form: FormData) {
  return resultAction(async () => {
    await assertRole([Role.FINANCE]);
    const description = text(form.get("description"), "Description", 250);
    const quantity = positiveInt(form.get("quantity"), "Quantity");
    const unitCents = amountFromForm(form.get("price"));
    const proforma = await serializable(async tx => {
      const item = await tx.proformaItem.findUnique({ where: { id: itemId } });
      if (!item) throw new UserError("That line no longer exists.");
      const found = await reopenForEdit(tx, item.proformaId);
      await tx.proformaItem.update({ where: { id: itemId }, data: { description, quantity, unitCents } });
      return found;
    });
    refresh(proforma.id, proforma.jobId);
  });
}

export async function removeProformaLine(itemId: string) {
  return resultAction(async () => {
    await assertRole([Role.FINANCE]);
    const proforma = await serializable(async tx => {
      const item = await tx.proformaItem.findUnique({ where: { id: itemId } });
      if (!item) throw new UserError("That line no longer exists.");
      const found = await reopenForEdit(tx, item.proformaId);
      await tx.proformaItem.delete({ where: { id: itemId } });
      return found;
    });
    refresh(proforma.id, proforma.jobId);
  });
}

export async function updateProformaDetails(proformaId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    const rawDate = String(form.get("validUntil") || "").trim();
    let validUntil: Date | null = null;
    if (rawDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(Date.parse(rawDate))) throw new UserError("Enter a valid date.");
      validUntil = new Date(`${rawDate}T00:00:00Z`);
    }
    const notes = String(form.get("notes") || "").trim().slice(0, 1000) || null;
    const proforma = await serializable(async tx => {
      const found = await tx.proforma.findUnique({ where: { id: proformaId } });
      if (!found) throw new UserError("Proforma not found.");
      // Changing what the customer reads is a new revision too.
      const changed = found.notes !== notes || found.validUntil?.getTime() !== validUntil?.getTime();
      if (changed) await reopenForEdit(tx, proformaId);
      await tx.proforma.update({ where: { id: proformaId }, data: { validUntil, notes } });
      return found;
    });
    refresh(proformaId, proforma.jobId);
  });
}

const STATUS_CHANGES = ["SENT", "ACCEPTED", "DECLINED"] as const;
type StatusChange = (typeof STATUS_CHANGES)[number];

export async function setProformaStatus(proformaId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    const status = String(form.get("status") || "") as StatusChange;
    if (!STATUS_CHANGES.includes(status)) throw new UserError("Choose a valid status.");
    const proforma = await serializable(async tx => {
      const found = await tx.proforma.findUnique({ where: { id: proformaId }, include: { _count: { select: { items: true } } } });
      if (!found) throw new UserError("Proforma not found.");
      if (!found._count.items) throw new UserError("Add at least one line first.");
      const now = new Date();
      await tx.proforma.update({
        where: { id: proformaId },
        data: status === "SENT"
          ? { status, sentAt: now, decidedAt: null }
          // A customer can accept on the spot, before it was formally sent.
          : { status, sentAt: found.sentAt ?? now, decidedAt: now },
      });
      return found;
    });
    refresh(proformaId, proforma.jobId);
  });
}

/**
 * A deposit is a real payment, so it is recorded on the job's invoice straight away
 * (creating the draft if needed) and counts toward the balance once the invoice is issued.
 */
export async function recordDeposit(proformaId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.FINANCE]);
    const amountCents = amountFromForm(form.get("amount"));
    if (amountCents <= 0) throw new UserError("Deposit must be greater than zero.");
    const method = text(form.get("method"), "Payment method", 50);
    const reference = String(form.get("reference") || "").trim().slice(0, 100) || null;
    const result = await serializable(async tx => {
      const proforma = await tx.proforma.findUnique({ where: { id: proformaId }, include: { items: true } });
      if (!proforma) throw new UserError("Proforma not found.");
      const quoted = proforma.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
      const invoice = await tx.invoice.upsert({ where: { jobId: proforma.jobId }, create: { jobId: proforma.jobId }, update: {}, include: { payments: true } });
      if (invoice.status !== "DRAFT") throw new UserError("The invoice is already issued. Record this payment on the invoice instead.");
      const deposited = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
      if (deposited + amountCents > quoted) throw new UserError("Deposits cannot exceed the proforma total.");
      await tx.payment.create({ data: { invoiceId: invoice.id, amountCents, method, reference, isDeposit: true } });
      return { jobId: proforma.jobId, invoiceId: invoice.id };
    });
    refresh(proformaId, result.jobId);
    revalidatePath(`/finance/invoices/${result.invoiceId}`);
  });
}
