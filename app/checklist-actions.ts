"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { text } from "@/lib/format";

export async function createTemplate(form: FormData) {
  await assertRole([Role.ADMIN]);
  const name = text(form.get("name"), "Template name", 120);
  const items = String(form.get("items") || "").split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  if (!items.length || items.length > 100 || items.some(item => item.length > 200)) throw new Error("Enter 1 to 100 checklist items, each under 200 characters.");
  await db.checklistTemplate.create({ data: { name, items: { create: items.map((label, sortOrder) => ({ label, sortOrder })) } } });
  revalidatePath("/checklists");
}

export async function updateTemplate(templateId: string, form: FormData) {
  await assertRole([Role.ADMIN]);
  const name = text(form.get("name"), "Template name", 120);
  const items = String(form.get("items") || "").split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  if (!items.length || items.length > 100 || items.some(item => item.length > 200)) throw new Error("Enter 1 to 100 checklist items, each under 200 characters.");
  await db.$transaction(async tx => {
    await tx.checklistTemplate.update({ where: { id: templateId }, data: { name, active: form.get("active") === "on" } });
    await tx.checklistTemplateItem.deleteMany({ where: { templateId } });
    await tx.checklistTemplateItem.createMany({ data: items.map((label, sortOrder) => ({ templateId, label, sortOrder })) });
  });
  revalidatePath("/checklists");
}
