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
    await db.businessProfile.upsert({ where: { id: "primary" }, create: { id: "primary", name, address, phone, email }, update: { name, address, phone, email } });
    revalidatePath("/settings");
    redirect("/settings?saved=1");
  });
}
