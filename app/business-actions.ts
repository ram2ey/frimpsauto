"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { formAction } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { text } from "@/lib/format";

export async function updateBusinessProfile(form: FormData) {
  return formAction(async () => {
    await assertRole([Role.ADMIN]);
    const name = text(form.get("name"), "Business name", 80);
    const address = String(form.get("address") || "").trim().slice(0, 160) || null;
    const phone = String(form.get("phone") || "").trim().slice(0, 50) || null;
    const email = String(form.get("email") || "").trim().slice(0, 100) || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError("Enter a valid business email.");
    const optional = (key: string, max: number) => String(form.get(key) || "").trim().slice(0, max) || null;
    const payment = {
      bankName: optional("bankName", 80),
      bankAccountName: optional("bankAccountName", 120),
      bankAccountNumber: optional("bankAccountNumber", 40),
      bankBranch: optional("bankBranch", 80),
      momoNumber: optional("momoNumber", 30),
      momoName: optional("momoName", 120),
    };
    const data = { name, address, phone, email, ...payment };
    await db.businessProfile.upsert({ where: { id: "primary" }, create: { id: "primary", ...data }, update: data });
    revalidatePath("/settings");
    redirect("/settings?saved=1");
  });
}
