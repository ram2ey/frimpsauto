"use server";

import { revalidatePath } from "next/cache";
import { Location, Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { positiveInt, text } from "@/lib/format";

const transferRoles = [Role.SUPERVISOR, Role.FINANCE, Role.SHOP_STAFF];

export async function createStockTransfer(form: FormData) {
  const actor = await assertRole(transferRoles);
  const partId = text(form.get("partId"), "Part");
  const rawFrom = String(form.get("fromLocation") || "").trim();
  const rawTo = String(form.get("toLocation") || "").trim();
  const quantity = positiveInt(form.get("quantity"), "Transfer quantity");
  const notes = String(form.get("notes") || "").trim().slice(0, 300) || null;

  if (rawFrom !== Location.WORKSHOP && rawFrom !== Location.RETAIL_SHOP) {
    throw new Error("Invalid source location.");
  }
  if (rawTo !== Location.WORKSHOP && rawTo !== Location.RETAIL_SHOP) {
    throw new Error("Invalid destination location.");
  }
  if (rawFrom === rawTo) {
    throw new Error("Source and destination locations must be different.");
  }

  const fromLocation = rawFrom as Location;
  const toLocation = rawTo as Location;

  const transfer = await db.$transaction(
    async (tx) => {
      const part = await tx.part.findUnique({ where: { id: partId } });
      if (!part || !part.active) throw new Error("Part not found or inactive.");

      if (fromLocation === Location.WORKSHOP) {
        if (part.stockQty < quantity) {
          throw new Error(`Insufficient stock in Workshop. Only ${part.stockQty} units available.`);
        }
        const updated = await tx.part.updateMany({
          where: { id: partId, stockQty: { gte: quantity } },
          data: {
            stockQty: { decrement: quantity },
            shopStockQty: { increment: quantity },
          },
        });
        if (!updated.count) {
          throw new Error("Insufficient stock in Workshop.");
        }
      } else {
        if (part.shopStockQty < quantity) {
          throw new Error(`Insufficient stock in Retail Shop. Only ${part.shopStockQty} units available.`);
        }
        const updated = await tx.part.updateMany({
          where: { id: partId, shopStockQty: { gte: quantity } },
          data: {
            shopStockQty: { decrement: quantity },
            stockQty: { increment: quantity },
          },
        });
        if (!updated.count) {
          throw new Error("Insufficient stock in Retail Shop.");
        }
      }

      const destLabel = toLocation === Location.WORKSHOP ? "Workshop Bay" : "Retail Parts Shop";
      const srcLabel = fromLocation === Location.WORKSHOP ? "Workshop Bay" : "Retail Parts Shop";

      // Log movement for sender
      await tx.stockMovement.create({
        data: {
          partId,
          userId: actor.id,
          location: fromLocation,
          delta: -quantity,
          reason: `Transfer to ${destLabel}${notes ? ` · Note: ${notes}` : ""}`,
        },
      });

      // Log movement for receiver
      await tx.stockMovement.create({
        data: {
          partId,
          userId: actor.id,
          location: toLocation,
          delta: quantity,
          reason: `Transfer from ${srcLabel}${notes ? ` · Note: ${notes}` : ""}`,
        },
      });

      // Record transfer ledger entry
      return tx.stockTransfer.create({
        data: {
          partId,
          fromLocation,
          toLocation,
          quantity,
          userId: actor.id,
          notes,
        },
      });
    },
    { isolationLevel: "Serializable" }
  );

  revalidatePath("/inventory");
  revalidatePath("/inventory/transfers");
  revalidatePath("/shop");
  revalidatePath("/shop/inventory");
  revalidatePath("/shop/transfers");
  revalidatePath("/finance");

  return { success: true, transferId: transfer.id, number: transfer.number };
}
