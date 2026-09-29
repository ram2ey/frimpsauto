"use server";

import { revalidatePath } from "next/cache";
import { Location, Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { amountFromForm, positiveInt, text } from "@/lib/format";

const managers = [Role.FINANCE, Role.SHOP_STAFF];

export async function createPart(form: FormData) {
  const actor = await assertRole(managers);
  const sku = text(form.get("sku"), "SKU", 60).toUpperCase();
  const name = text(form.get("name"), "Part name", 160);
  const priceCents = amountFromForm(form.get("price"));
  const stockQty = Number(form.get("stockQty") || 0);
  const reorderLevel = Number(form.get("reorderLevel") || 0);
  if (![stockQty, reorderLevel].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error("Stock values must be nonnegative whole numbers.");

  const rawLoc = String(form.get("location") || "").trim();
  const location = rawLoc === Location.RETAIL_SHOP || actor.role === Role.SHOP_STAFF ? Location.RETAIL_SHOP : Location.WORKSHOP;
  const isShop = location === Location.RETAIL_SHOP;

  await db.$transaction(async tx => {
    const part = await tx.part.create({
      data: {
        sku,
        name,
        priceCents,
        stockQty: isShop ? 0 : stockQty,
        reorderLevel: isShop ? 0 : reorderLevel,
        shopStockQty: isShop ? stockQty : 0,
        shopReorderLevel: isShop ? reorderLevel : 0,
      },
    });
    if (stockQty) {
      await tx.stockMovement.create({
        data: {
          partId: part.id,
          userId: actor.id,
          location,
          delta: stockQty,
          reason: `Opening stock at ${isShop ? "Retail Parts Shop" : "Workshop"}`,
        },
      });
    }
  });
  revalidatePath("/inventory");
  revalidatePath("/shop");
  revalidatePath("/shop/inventory");
}

export async function updatePart(partId: string, form: FormData) {
  await assertRole(managers);
  const reorderLevel = Number(form.get("reorderLevel") || 0);
  if (!Number.isSafeInteger(reorderLevel) || reorderLevel < 0) throw new Error("Invalid reorder level.");
  await db.part.update({ where: { id: partId }, data: {
    name: text(form.get("name"), "Part name", 160),
    priceCents: amountFromForm(form.get("price")),
    reorderLevel,
    active: form.get("active") === "on",
  } });
  revalidatePath("/inventory");
}

export async function adjustStock(partId: string, form: FormData) {
  const actor = await assertRole(managers);
  const delta = Number(form.get("delta"));
  if (!Number.isSafeInteger(delta) || !delta || Math.abs(delta) > 100000) throw new Error("Enter a nonzero whole number for the adjustment.");
  const reason = text(form.get("reason"), "Reason", 300);

  const rawLoc = String(form.get("location") || "").trim();
  const location = rawLoc === Location.RETAIL_SHOP || actor.role === Role.SHOP_STAFF ? Location.RETAIL_SHOP : Location.WORKSHOP;
  const isShop = location === Location.RETAIL_SHOP;

  await db.$transaction(async tx => {
    if (isShop) {
      if (delta < 0) {
        const updated = await tx.part.updateMany({ where: { id: partId, shopStockQty: { gte: -delta } }, data: { shopStockQty: { increment: delta } } });
        if (!updated.count) throw new Error("Insufficient stock in Retail Shop.");
      } else {
        await tx.part.update({ where: { id: partId }, data: { shopStockQty: { increment: delta } } });
      }
    } else {
      if (delta < 0) {
        const updated = await tx.part.updateMany({ where: { id: partId, stockQty: { gte: -delta } }, data: { stockQty: { increment: delta } } });
        if (!updated.count) throw new Error("Insufficient stock in Workshop.");
      } else {
        await tx.part.update({ where: { id: partId }, data: { stockQty: { increment: delta } } });
      }
    }
    await tx.stockMovement.create({
      data: {
        partId,
        userId: actor.id,
        location,
        delta,
        reason,
      },
    });
  });
  revalidatePath("/inventory");
  revalidatePath("/shop");
  revalidatePath("/shop/inventory");
}

export async function decidePartRequest(requestId: string, form: FormData) {
  await assertRole(managers);
  const decision = String(form.get("decision"));
  if (!["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid decision.");
  const request = await db.partRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "REQUESTED") throw new Error("This request has already been processed.");
  const updated = await db.partRequest.updateMany({ where: { id: requestId, status: "REQUESTED" }, data: { status: decision as "APPROVED" | "REJECTED", decidedAt: new Date(), decisionNote: String(form.get("note") || "").trim().slice(0, 500) || null } });
  if (!updated.count) throw new Error("This request has already been processed.");
  if (decision === "REJECTED") {
    const open = await db.partRequest.count({ where: { jobId: request.jobId, status: { in: ["REQUESTED", "APPROVED"] } } });
    if (!open) {
      const job = await db.job.findUniqueOrThrow({ where: { id: request.jobId } });
      await db.job.update({ where: { id: job.id }, data: { status: job.technicianId ? "IN_PROGRESS" : "OPEN" } });
    }
  }
  revalidatePath("/finance");
  revalidatePath(`/jobs/${request.jobId}`);
}

export async function issuePart(requestId: string, form: FormData) {
  const actor = await assertRole(managers);
  const quantity = positiveInt(form.get("quantity"), "Issued quantity");
  const request = await db.partRequest.findUnique({ where: { id: requestId }, include: { part: true } });
  if (!request || request.status !== "APPROVED") throw new Error("Part request is not approved.");
  if (quantity > request.requestedQty) throw new Error("Issued quantity exceeds the requested quantity.");
  await db.$transaction(async tx => {
    const stock = await tx.part.updateMany({ where: { id: request.partId, stockQty: { gte: quantity } }, data: { stockQty: { decrement: quantity } } });
    if (!stock.count) throw new Error("Insufficient stock. Add stock before issuing this part.");
    const locked = await tx.partRequest.updateMany({ where: { id: requestId, status: "APPROVED" }, data: { status: "ISSUED", issuedQty: quantity, issuedAt: new Date() } });
    if (!locked.count) throw new Error("Part request was already issued.");
    await tx.stockMovement.create({
      data: {
        partId: request.partId,
        userId: actor.id,
        location: Location.WORKSHOP,
        delta: -quantity,
        reason: `Issued to job ${request.jobId}`,
      },
    });
    const invoice = await tx.invoice.upsert({ where: { jobId: request.jobId }, create: { jobId: request.jobId }, update: {} });
    if (invoice.status !== "DRAFT") throw new Error("The invoice is already issued.");
    await tx.invoiceItem.create({ data: { invoiceId: invoice.id, type: "PART", requestId, description: `${request.part.name} (${request.part.sku})`, quantity, unitCents: request.part.priceCents } });
    const open = await tx.partRequest.count({ where: { jobId: request.jobId, status: { in: ["REQUESTED", "APPROVED"] } } });
    if (!open) {
      const job = await tx.job.findUniqueOrThrow({ where: { id: request.jobId } });
      await tx.job.update({ where: { id: job.id }, data: { status: job.technicianId ? "IN_PROGRESS" : "OPEN" } });
    }
  }, { isolationLevel: "Serializable" });
  revalidatePath("/finance");
  revalidatePath("/inventory");
  revalidatePath(`/jobs/${request.jobId}`);
}
