"use server";

import { revalidatePath } from "next/cache";
import { Location, Role } from "@/generated/prisma/client";
import { formAction, serializable } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { amountFromForm, positiveInt, text } from "@/lib/format";

/** Can record stock at their own location (deliveries, shelf reorder levels). */
const stockKeepers = [Role.FINANCE, Role.SHOP_STAFF];
/** Pricing and catalog control: create priced parts, change prices, deactivate parts, write stock off,
 *  and approve/issue workshop part requests. Finance only (ADMIN always passes). */
const financeOnly = [Role.FINANCE];

function nonNegativeInt(value: FormDataEntryValue | null, label: string) {
  const number = Number(value || 0);
  if (!Number.isSafeInteger(number) || number < 0) throw new UserError(`${label} must be a whole number of 0 or more.`);
  return number;
}

export async function createPart(form: FormData) {
  // A new part carries a catalog price, so creating one is a pricing decision.
  const actor = await assertRole(financeOnly);
  const sku = text(form.get("sku"), "SKU", 60).toUpperCase();
  const name = text(form.get("name"), "Part name", 160);
  const priceCents = amountFromForm(form.get("price"));
  const stockQty = Number(form.get("stockQty") || 0);
  const reorderLevel = Number(form.get("reorderLevel") || 0);
  if (![stockQty, reorderLevel].every(n => Number.isSafeInteger(n) && n >= 0)) throw new UserError("Stock values must be nonnegative whole numbers.");

  const rawLoc = String(form.get("location") || "").trim();
  const location = rawLoc === Location.RETAIL_SHOP || actor.role === Role.SHOP_STAFF ? Location.RETAIL_SHOP : Location.WORKSHOP;
  const isShop = location === Location.RETAIL_SHOP;

  if (await db.part.findUnique({ where: { sku }, select: { id: true } })) {
    throw new UserError(`SKU ${sku} is already in use. Choose a unique SKU for this part.`);
  }

  try {
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
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new UserError(`SKU ${sku} is already in use. Choose a unique SKU for this part.`);
    }
    throw error;
  }
  revalidatePath("/inventory");
  revalidatePath("/shop");
  revalidatePath("/shop/inventory");
}

export async function createPartWithFeedback(_previous: { error: string | null; success: boolean }, form: FormData) {
  try {
    await createPart(form);
    return { error: null, success: true };
  } catch (error) {
    if (error instanceof UserError) return { error: error.message, success: false };
    return { error: "Unable to add this part. Check the details and try again.", success: false };
  }
}

export async function updatePart(partId: string, form: FormData) {
  return formAction(async () => {
    await assertRole(financeOnly);
    const priceCents = amountFromForm(form.get("price"));
    if (priceCents < 1) throw new UserError("Price must be greater than zero.");
    await db.part.update({ where: { id: partId }, data: {
      name: text(form.get("name"), "Part name", 160),
      priceCents,
      reorderLevel: nonNegativeInt(form.get("reorderLevel"), "Bay reorder level"),
      shopReorderLevel: nonNegativeInt(form.get("shopReorderLevel"), "Shop reorder level"),
      active: form.get("active") === "on",
    } });
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${partId}`);
    revalidatePath("/shop");
    revalidatePath("/shop/inventory");
  });
}

/** Shop staff can tune when the shelf shows a low-stock alert, without touching prices. */
export async function setShopReorderLevel(form: FormData) {
  return formAction(async () => {
    await assertRole(stockKeepers);
    const partId = text(form.get("partId"), "Part", 60);
    await db.part.update({ where: { id: partId }, data: { shopReorderLevel: nonNegativeInt(form.get("shopReorderLevel"), "Shelf reorder level") } });
    revalidatePath("/shop");
    revalidatePath("/shop/inventory");
    revalidatePath("/inventory");
  });
}

export async function adjustStock(partId: string, form: FormData) {
  return formAction(async () => {
    const actor = await assertRole(stockKeepers);
    const delta = Number(form.get("delta"));
    if (!Number.isSafeInteger(delta) || !delta || Math.abs(delta) > 100000) throw new UserError("Enter a nonzero whole number for the adjustment.");
    if (delta < 0 && actor.role === Role.SHOP_STAFF) throw new UserError("Stock write-offs need Finance or an Admin. Record deliveries here; use sales and transfers for stock going out.");
    const reason = text(form.get("reason"), "Reason", 300);

    const rawLoc = String(form.get("location") || "").trim();
    const location = rawLoc === Location.RETAIL_SHOP || actor.role === Role.SHOP_STAFF ? Location.RETAIL_SHOP : Location.WORKSHOP;
    const isShop = location === Location.RETAIL_SHOP;

    await db.$transaction(async tx => {
      if (isShop) {
        if (delta < 0) {
          const updated = await tx.part.updateMany({ where: { id: partId, shopStockQty: { gte: -delta } }, data: { shopStockQty: { increment: delta } } });
          if (!updated.count) throw new UserError("Insufficient stock in Retail Shop.");
        } else {
          await tx.part.update({ where: { id: partId }, data: { shopStockQty: { increment: delta } } });
        }
      } else {
        if (delta < 0) {
          const updated = await tx.part.updateMany({ where: { id: partId, stockQty: { gte: -delta } }, data: { stockQty: { increment: delta } } });
          if (!updated.count) throw new UserError("Insufficient stock in Workshop.");
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
    revalidatePath(`/inventory/${partId}`);
    revalidatePath("/shop");
    revalidatePath("/shop/inventory");
  });
}

export async function decidePartRequest(requestId: string, form: FormData) {
  return formAction(async () => {
    await assertRole(financeOnly);
    const decision = String(form.get("decision"));
    if (decision !== "APPROVED" && decision !== "REJECTED") throw new UserError("Invalid decision.");
    const request = await serializable(async tx => {
      const found = await tx.partRequest.findUnique({ where: { id: requestId } });
      if (!found || found.status !== "REQUESTED") throw new UserError("This request has already been processed.");
      await tx.partRequest.update({ where: { id: requestId }, data: { status: decision, decidedAt: new Date(), decisionNote: String(form.get("note") || "").trim().slice(0, 500) || null } });
      if (decision === "REJECTED") {
        const open = await tx.partRequest.count({ where: { jobId: found.jobId, status: { in: ["REQUESTED", "APPROVED"] } } });
        if (!open) {
          const job = await tx.job.findUniqueOrThrow({ where: { id: found.jobId } });
          if (job.status === "WAITING_PARTS") await tx.job.update({ where: { id: job.id }, data: { status: job.technicianId ? "IN_PROGRESS" : "OPEN" } });
        }
      }
      return found;
    });
    revalidatePath("/finance");
    revalidatePath(`/jobs/${request.jobId}`);
  });
}

export async function issuePart(requestId: string, form: FormData) {
  return formAction(async () => {
    const actor = await assertRole(financeOnly);
    const quantity = positiveInt(form.get("quantity"), "Issued quantity");
    const request = await serializable(async tx => {
      const request = await tx.partRequest.findUnique({ where: { id: requestId }, include: { part: true, job: { select: { number: true } } } });
      if (!request || request.status !== "APPROVED") throw new UserError("Part request is not approved.");
      if (quantity > request.requestedQty) throw new UserError("Issued quantity exceeds the requested quantity.");
      const stock = await tx.part.updateMany({ where: { id: request.partId, stockQty: { gte: quantity } }, data: { stockQty: { decrement: quantity } } });
      if (!stock.count) throw new UserError(`Insufficient workshop stock for ${request.part.name}. Only ${request.part.stockQty} available.`);
      const locked = await tx.partRequest.updateMany({ where: { id: requestId, status: "APPROVED" }, data: { status: "ISSUED", issuedQty: quantity, issuedAt: new Date() } });
      if (!locked.count) throw new UserError("Part request was already issued.");
      await tx.stockMovement.create({
        data: {
          partId: request.partId,
          userId: actor.id,
          location: Location.WORKSHOP,
          delta: -quantity,
          reason: `Issued to Job #${String(request.job.number).padStart(5, "0")}`,
        },
      });
      const invoice = await tx.invoice.upsert({ where: { jobId: request.jobId }, create: { jobId: request.jobId }, update: {} });
      if (invoice.status !== "DRAFT") throw new UserError("The invoice is already issued.");
      await tx.invoiceItem.create({ data: { invoiceId: invoice.id, type: "PART", requestId, description: `${request.part.name} (${request.part.sku})`, quantity, unitCents: request.part.priceCents } });
      const open = await tx.partRequest.count({ where: { jobId: request.jobId, status: { in: ["REQUESTED", "APPROVED"] } } });
      if (!open) {
        const job = await tx.job.findUniqueOrThrow({ where: { id: request.jobId } });
        await tx.job.update({ where: { id: job.id }, data: { status: job.technicianId ? "IN_PROGRESS" : "OPEN" } });
      }
      return request;
    });
    revalidatePath("/finance");
    revalidatePath("/inventory");
    revalidatePath(`/jobs/${request.jobId}`);
  });
}
