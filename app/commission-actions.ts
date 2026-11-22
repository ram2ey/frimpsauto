"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { formAction, serializable } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { text } from "@/lib/format";

/** Pay rates are the owner's call, so only admins can set them. A blank rate means no commission. */
export async function setCommissionRate(technicianId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.ADMIN]);
    const raw = String(form.get("rate") ?? "").trim();
    let commissionBps: number | null = null;
    if (raw) {
      if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) throw new UserError("Enter a percentage such as 20 or 12.5.");
      commissionBps = Math.round(Number(raw) * 100);
      if (commissionBps > 10000) throw new UserError("The rate cannot be more than 100%.");
    }
    const technician = await db.user.findUnique({ where: { id: technicianId } });
    if (!technician || technician.role !== Role.TECHNICIAN) throw new UserError("Only technicians earn commission.");
    await db.user.update({ where: { id: technicianId }, data: { commissionBps } });
    revalidatePath("/finance/commissions");
  });
}

export async function recordCommissionPayout(technicianId: string, form: FormData) {
  return formAction(async () => {
    const actor = await assertRole([Role.FINANCE]);
    const ids = [...new Set(form.getAll("commissionId").map(String))];
    if (!ids.length) throw new UserError("Tick at least one job to pay.");
    const method = text(form.get("method"), "Payment method", 50);
    const reference = String(form.get("reference") || "").trim().slice(0, 100) || null;
    const note = String(form.get("note") || "").trim().slice(0, 500) || null;
    const payout = await serializable(async tx => {
      const commissions = await tx.commission.findMany({ where: { id: { in: ids }, technicianId, payoutId: null } });
      if (commissions.length !== ids.length) throw new UserError("Some of these commissions were already paid. Refresh the page and try again.");
      const amountCents = commissions.reduce((sum, commission) => sum + commission.amountCents, 0);
      const created = await tx.commissionPayout.create({ data: { technicianId, amountCents, method, reference, note, paidById: actor.id } });
      await tx.commission.updateMany({ where: { id: { in: ids }, payoutId: null }, data: { payoutId: created.id } });
      return created;
    });
    revalidatePath("/finance/commissions");
    revalidatePath("/dashboard");
    redirect(`/finance/commissions/payouts/${payout.id}`);
  });
}
