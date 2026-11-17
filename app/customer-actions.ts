"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client";
import { formAction } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { text } from "@/lib/format";
import { deletePrivateObject, putPrivateObject, readVehiclePhoto } from "@/lib/storage";

export async function updateCustomer(customerId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.SUPERVISOR]);
    const email = String(form.get("email") || "").trim().slice(0, 200) || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError("Enter a valid email or leave it blank.");
    await db.customer.update({ where: { id: customerId }, data: {
      name: text(form.get("name"), "Customer name", 120),
      phone: text(form.get("phone"), "Phone", 50),
      email,
      notes: String(form.get("notes") || "").trim().slice(0, 1000) || null,
    } });
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/customers");
    revalidatePath("/jobs");
  });
}

export async function updateVehicle(vehicleId: string, form: FormData) {
  return formAction(async () => {
    await assertRole([Role.SUPERVISOR]);
    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new UserError("Vehicle not found.");
    const year = Number(form.get("year"));
    if (!Number.isSafeInteger(year) || year < 1926 || year > new Date().getFullYear() + 1) throw new UserError("Invalid model year.");
    const modelName = text(form.get("modelName"), "Vehicle model", 120);
    const model = await db.vehicleModel.findFirst({ where: { name: { equals: modelName, mode: "insensitive" } } });

    const photo = await readVehiclePhoto(form.get("vehiclePhoto"));
    let photoKey = vehicle.photoKey;
    if (photo) {
      photoKey = `vehicles/${vehicleId}/${randomUUID()}.${photo.ext}`;
      await putPrivateObject(photoKey, photo.bytes);
    }

    await db.vehicle.update({ where: { id: vehicleId }, data: {
      year, modelId: model?.id || null, customModel: model ? null : modelName,
      vin: String(form.get("vin") || "").trim().toUpperCase().slice(0, 17) || null,
      plate: String(form.get("plate") || "").trim().toUpperCase().slice(0, 32) || null,
      color: String(form.get("color") || "").trim().slice(0, 40) || null,
      photoKey,
    } });
    if (photoKey !== vehicle.photoKey) await deletePrivateObject(vehicle.photoKey);
    revalidatePath(`/customers/${vehicle.customerId}`);
    revalidatePath("/customers");
    revalidatePath("/jobs");
  });
}
