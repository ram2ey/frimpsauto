"use server";

import { revalidatePath } from "next/cache";
import { Location, Role } from "@/generated/prisma/client";
import { resultAction, serializable } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { amountFromForm, money, text } from "@/lib/format";
import { MAX_LINE_QUANTITY, MAX_SALE_LINES, canSetPrices } from "@/lib/sale-rules";

const sellers = [Role.FINANCE, Role.SUPERVISOR, Role.SHOP_STAFF];

type SaleLine = { partId: string; quantity: number; unitCents: number };

function readLines(form: FormData): SaleLine[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(form.get("itemsJson") ?? ""));
  } catch {
    throw new UserError("The cart could not be read. Refresh and try again.");
  }
  if (!Array.isArray(parsed) || !parsed.length) throw new UserError("At least one part is required to complete a sale.");
  if (parsed.length > MAX_SALE_LINES) throw new UserError(`A sale can have at most ${MAX_SALE_LINES} lines.`);

  const merged = new Map<string, SaleLine>();
  for (const raw of parsed) {
    const item = (raw ?? {}) as { partId?: unknown; quantity?: unknown; unitPrice?: unknown };
    const partId = typeof item.partId === "string" ? item.partId : "";
    const quantity = Number(item.quantity);
    if (!partId) throw new UserError("A cart line is missing its part.");
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new UserError(`Each quantity must be a whole number from 1 to ${MAX_LINE_QUANTITY}.`);
    }
    const unitCents = amountFromForm(String(item.unitPrice ?? ""));
    if (unitCents < 1) throw new UserError("Every line needs a price above zero.");
    const existing = merged.get(partId);
    if (existing && existing.unitCents !== unitCents) throw new UserError("The same part appears twice with different prices.");
    merged.set(partId, { partId, unitCents, quantity: (existing?.quantity ?? 0) + quantity });
  }
  return [...merged.values()];
}

export async function createDirectSale(form: FormData) {
  return resultAction(async () => {
    const actor = await assertRole(sellers);
    const location = form.get("location") === Location.RETAIL_SHOP ? Location.RETAIL_SHOP : Location.WORKSHOP;
    if (actor.role === Role.SHOP_STAFF && location !== Location.RETAIL_SHOP) {
      throw new UserError("Shop staff can only process sales from the Retail Parts Shop.");
    }

    const customerName = String(form.get("customerName") || "").trim().slice(0, 120) || "Walk-in Customer";
    const customerPhone = String(form.get("customerPhone") || "").trim().slice(0, 50) || null;
    const paymentMethod = text(form.get("paymentMethod"), "Payment method", 50);
    const staffNotes = String(form.get("notes") || "").trim().slice(0, 300);
    const discountReason = String(form.get("discountReason") || "").trim().slice(0, 300);
    const lines = readLines(form);
    const locLabel = location === Location.WORKSHOP ? "Workshop Counter" : "Retail Parts Shop";

    const sale = await serializable(async tx => {
      const discounts: string[] = [];
      for (const line of lines) {
        const part = await tx.part.findUnique({ where: { id: line.partId } });
        if (!part || !part.active) throw new UserError("A part in the cart was not found or is inactive.");

        // Pricing belongs to Finance and Admin. Everyone else sells at the catalog price.
        if (line.unitCents !== part.priceCents && !canSetPrices(actor.role)) {
          throw new UserError(`"${part.name}" must be sold at its catalog price of ${money(part.priceCents)}. Only Finance or an Admin can change prices.`);
        }
        // A Finance/Admin price below catalog is a discount and needs a reason, which is kept on the sale.
        if (line.unitCents < part.priceCents) {
          const percent = ((part.priceCents - line.unitCents) / part.priceCents) * 100;
          if (!discountReason) throw new UserError(`"${part.name}" is below its catalog price of ${money(part.priceCents)}. Enter a discount reason.`);
          discounts.push(`${part.sku} ${money(part.priceCents)} → ${money(line.unitCents)} (−${percent.toFixed(1)}%)`);
        }

        const stockField = location === Location.WORKSHOP ? "stockQty" : "shopStockQty";
        const available = part[stockField];
        const updated = await tx.part.updateMany({
          where: { id: line.partId, [stockField]: { gte: line.quantity } },
          data: { [stockField]: { decrement: line.quantity } },
        });
        if (!updated.count) throw new UserError(`Insufficient stock for "${part.name}" at the ${locLabel}. Only ${available} available.`);

        await tx.stockMovement.create({
          data: { partId: line.partId, userId: actor.id, location, delta: -line.quantity, reason: `Direct counter sale at ${locLabel} · Customer: ${customerName}` },
        });
      }

      const notes = [staffNotes, discounts.length ? `Discount by ${actor.name}: ${discounts.join("; ")}. Reason: ${discountReason}` : ""]
        .filter(Boolean)
        .join("\n") || null;

      return tx.directSale.create({
        data: {
          location,
          customerName,
          customerPhone,
          totalCents: lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0),
          paymentMethod,
          sellerId: actor.id,
          notes,
          items: { create: lines },
        },
      });
    });

    revalidatePath("/finance");
    revalidatePath("/inventory");
    revalidatePath("/shop");
    revalidatePath("/shop/sales");
    revalidatePath("/shop/inventory");
    return { saleId: sale.id, saleNumber: sale.number, totalCents: sale.totalCents };
  });
}
