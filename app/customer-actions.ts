"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { text } from "@/lib/format";

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
  const mileageText = String(form.get("mileage") || "").trim();
  const mileage = mileageText ? Number(mileageText) : null;
  if (mileage !== null && (!Number.isSafeInteger(mileage) || mileage < 0)) throw new Error("Invalid mileage.");
  await db.vehicle.update({ where: { id: vehicleId }, data: {
    year, modelId: model?.id || null, customModel: model ? null : modelName,
    vin: String(form.get("vin") || "").trim().toUpperCase().slice(0, 17) || null,
    plate: String(form.get("plate") || "").trim().toUpperCase().slice(0, 32) || null,
    color: String(form.get("color") || "").trim().slice(0, 40) || null,
    mileage,
  } });
  revalidatePath(`/customers/${vehicle.customerId}`);
  revalidatePath("/customers");
  revalidatePath("/jobs");
}
