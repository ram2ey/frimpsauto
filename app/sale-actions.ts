"use server";

import { revalidatePath } from "next/cache";
import { Location, Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { amountFromForm, positiveInt, text } from "@/lib/format";

const sellers = [Role.FINANCE, Role.SUPERVISOR, Role.SHOP_STAFF];

export interface SaleItemInput {
  partId: string;
  quantity: number;
  unitCents: number;
}

export async function createDirectSale(form: FormData) {
  const actor = await assertRole(sellers);
  const rawLoc = String(form.get("location") || Location.WORKSHOP).trim();
  const location = rawLoc === Location.RETAIL_SHOP ? Location.RETAIL_SHOP : Location.WORKSHOP;

  // Enforce shop staff only sells at retail shop
  if (actor.role === Role.SHOP_STAFF && location !== Location.RETAIL_SHOP) {
    throw new Error("Shop staff can only process sales from the Retail Parts Shop.");
  }

  const customerName = String(form.get("customerName") || "").trim().slice(0, 120) || "Walk-in Customer";
  const customerPhone = String(form.get("customerPhone") || "").trim().slice(0, 50) || null;
  const paymentMethod = text(form.get("paymentMethod"), "Payment method", 50);
  const notes = String(form.get("notes") || "").trim().slice(0, 300) || null;

  // Read items: can be passed as JSON or single part item fields
  let items: SaleItemInput[] = [];
  const itemsJson = form.get("itemsJson");
  if (itemsJson && typeof itemsJson === "string") {
    try {
      const parsed = JSON.parse(itemsJson) as { partId: string; quantity: number; unitPrice: string | number }[];
      items = parsed.map((item) => ({
        partId: String(item.partId),
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        unitCents: Math.round(Number(item.unitPrice) * 100),
      }));
    } catch {
      throw new Error("Invalid items payload.");
    }
  } else {
    const partId = text(form.get("partId"), "Part");
    const quantity = positiveInt(form.get("quantity"), "Quantity");
    const unitCents = amountFromForm(form.get("price"));
    items = [{ partId, quantity, unitCents }];
  }

  if (!items.length) {
    throw new Error("At least one part is required to complete a sale.");
  }

  const totalCents = items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
  if (totalCents <= 0) {
    throw new Error("Total sale amount must be greater than zero.");
  }

  const locLabel = location === Location.WORKSHOP ? "Workshop Counter" : "Retail Parts Shop";

  const sale = await db.$transaction(
    async (tx) => {
      // 1. Verify stock and decrement for each item
      for (const item of items) {
        const part = await tx.part.findUnique({ where: { id: item.partId } });
        if (!part || !part.active) {
          throw new Error(`Part not found or inactive.`);
        }

        if (location === Location.WORKSHOP) {
          if (part.stockQty < item.quantity) {
            throw new Error(`Insufficient stock for "${part.name}" in Workshop. Only ${part.stockQty} available.`);
          }
          const updated = await tx.part.updateMany({
            where: { id: item.partId, stockQty: { gte: item.quantity } },
            data: { stockQty: { decrement: item.quantity } },
          });
          if (!updated.count) {
            throw new Error(`Insufficient stock for "${part.name}" in Workshop.`);
          }
        } else {
          if (part.shopStockQty < item.quantity) {
            throw new Error(`Insufficient stock for "${part.name}" in Retail Shop. Only ${part.shopStockQty} available.`);
          }
          const updated = await tx.part.updateMany({
            where: { id: item.partId, shopStockQty: { gte: item.quantity } },
            data: { shopStockQty: { decrement: item.quantity } },
          });
          if (!updated.count) {
            throw new Error(`Insufficient stock for "${part.name}" in Retail Shop.`);
          }
        }

        // Log StockMovement
        await tx.stockMovement.create({
          data: {
            partId: item.partId,
            userId: actor.id,
            location,
            delta: -item.quantity,
            reason: `Direct counter sale at ${locLabel} · Customer: ${customerName}`,
          },
        });
      }

      // 2. Create DirectSale record with line items
      return tx.directSale.create({
        data: {
          location,
          customerName,
          customerPhone,
          totalCents,
          paymentMethod,
          sellerId: actor.id,
          notes,
          items: {
            create: items.map((i) => ({
              partId: i.partId,
              quantity: i.quantity,
              unitCents: i.unitCents,
            })),
          },
        },
        include: {
          items: { include: { part: true } },
          seller: true,
        },
      });
    },
    { isolationLevel: "Serializable" }
  );

  revalidatePath("/finance");
  revalidatePath("/inventory");
  revalidatePath("/shop");
  revalidatePath("/shop/sales");
  revalidatePath("/shop/inventory");

  return { success: true, saleId: sale.id, saleNumber: sale.number };
}
