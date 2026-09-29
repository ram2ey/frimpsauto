"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { text } from "@/lib/format";
import { putPrivateObject } from "@/lib/storage";

export async function updateCustomer(customerId: string, form: FormData) {
  await assertRole([Role.SUPERVISOR]);
  await db.customer.update({ where: { id: customerId }, data: {
    name: text(form.get("name"), "Customer name", 120),
    phone: text(form.get("phone"), "Phone", 50),
    email: String(form.get("email") || "").trim().slice(0, 200) || null,
    notes: String(form.get("notes") || "").trim().slice(0, 1000) || null,
  } });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/jobs");
}

export async function updateVehicle(vehicleId: string, form: FormData) {
  await assertRole([Role.SUPERVISOR]);
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found.");
  const year = Number(form.get("year"));
  if (!Number.isSafeInteger(year) || year < 1926 || year > new Date().getFullYear() + 1) throw new Error("Invalid model year.");
  const modelName = text(form.get("modelName"), "Vehicle model", 120);
  const model = await db.vehicleModel.findFirst({ where: { name: { equals: modelName, mode: "insensitive" } } });

  const photoFile = form.get("vehiclePhoto") as File | null;
  let photoKey = vehicle.photoKey;
  if (photoFile && photoFile.size > 0 && photoFile.size <= 10 * 1024 * 1024) {
    const mime = photoFile.type.toLowerCase();
    let ext: string | null = null;
    if (mime === "image/png") ext = "png";
    else if (mime === "image/webp") ext = "webp";
    else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
    if (ext) {
      const buffer = new Uint8Array(await photoFile.arrayBuffer());
      photoKey = `vehicles/${vehicleId}/${randomUUID()}.${ext}`;
      await putPrivateObject(photoKey, buffer);
    }
  }

  await db.vehicle.update({ where: { id: vehicleId }, data: {
    year, modelId: model?.id || null, customModel: model ? null : modelName,
    vin: String(form.get("vin") || "").trim().toUpperCase().slice(0, 17) || null,
    plate: String(form.get("plate") || "").trim().toUpperCase().slice(0, 32) || null,
    color: String(form.get("color") || "").trim().slice(0, 40) || null,
    photoKey,
  } });
  revalidatePath(`/customers/${vehicle.customerId}`);
  revalidatePath("/customers");
  revalidatePath("/jobs");
}
