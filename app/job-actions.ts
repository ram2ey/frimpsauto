"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { JobStatus, Role } from "@/generated/prisma/client";
import { formAction, resultAction } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { positiveInt, text } from "@/lib/format";
import { deletePrivateObject, putPrivateObject, readVehiclePhoto } from "@/lib/storage";

const editors = [Role.SUPERVISOR];

export async function createJob(form: FormData) {
  return formAction(async () => {
    const actor = await assertRole(editors);
    const complaint = text(form.get("complaint"), "Customer complaint", 3000);
    const technicianId = String(form.get("technicianId") || "") || null;
    if (technicianId) {
      const tech = await db.user.findUnique({ where: { id: technicianId } });
      if (!tech || tech.role !== Role.TECHNICIAN || !tech.active) throw new UserError("Choose an active technician.");
    }
    const existingVehicleId = String(form.get("existingVehicleId") || "");
    const existingCustomerId = String(form.get("existingCustomerId") || "");
    const year = existingVehicleId ? null : positiveInt(form.get("year"), "Model year");
    if (year && (year < 1926 || year > new Date().getFullYear() + 1)) throw new UserError("Choose a valid Mercedes-Benz model year.");
    const modelName = existingVehicleId ? null : text(form.get("modelName"), "Vehicle model", 120);
    const customerName = !existingVehicleId && !existingCustomerId ? text(form.get("customerName"), "Customer name", 120) : null;
    const customerPhone = !existingVehicleId && !existingCustomerId ? text(form.get("customerPhone"), "Phone", 50) : null;
    const templateId = String(form.get("templateId") || "");
    const template = templateId ? await db.checklistTemplate.findUnique({ where: { id: templateId }, include: { items: { orderBy: { sortOrder: "asc" } } } }) : null;
    if (templateId && (!template || !template.active)) throw new UserError("Choose an active checklist template.");

    const customerEmail = String(form.get("customerEmail") || "").trim().slice(0, 200) || null;
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new UserError("Enter a valid customer email or leave it blank.");

    // Optional vehicle photo. The file is written before the database points at it, so a
    // failed write can never leave a vehicle referring to a missing photo.
    const photo = await readVehiclePhoto(form.get("vehiclePhoto"));
    const photoKey = photo ? `vehicles/${randomUUID()}/${randomUUID()}.${photo.ext}` : null;
    if (photo && photoKey) await putPrivateObject(photoKey, photo.bytes);
    let replacedPhotoKey: string | null = null;

    const job = await db.$transaction(async tx => {
      let customerId: string;
      let vehicleId: string;
      if (existingVehicleId) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: existingVehicleId } });
        if (!vehicle || (existingCustomerId && vehicle.customerId !== existingCustomerId)) throw new UserError("Vehicle not found for this customer.");
        customerId = vehicle.customerId;
        vehicleId = vehicle.id;
        if (photoKey) {
          replacedPhotoKey = vehicle.photoKey;
          await tx.vehicle.update({ where: { id: existingVehicleId }, data: { photoKey } });
        }
      } else {
        if (existingCustomerId) {
          const customer = await tx.customer.findUnique({ where: { id: existingCustomerId } });
          if (!customer) throw new UserError("Customer not found.");
          customerId = customer.id;
        } else {
          const customer = await tx.customer.create({ data: { name: customerName!, phone: customerPhone!, email: customerEmail } });
          customerId = customer.id;
        }
        const catalogModel = await tx.vehicleModel.findFirst({ where: { name: { equals: modelName!, mode: "insensitive" } } });
        const vehicle = await tx.vehicle.create({ data: {
          customerId, year: year!, modelId: catalogModel?.id || null,
          customModel: catalogModel ? null : modelName,
          vin: String(form.get("vin") || "").trim().toUpperCase().slice(0, 17) || null,
          plate: String(form.get("plate") || "").trim().toUpperCase().slice(0, 32) || null,
          color: String(form.get("color") || "").trim().slice(0, 40) || null,
          photoKey,
        } });
        vehicleId = vehicle.id;
      }
      return tx.job.create({ data: {
        customerId, vehicleId, complaint, createdById: actor.id, technicianId,
        status: technicianId ? JobStatus.IN_PROGRESS : JobStatus.OPEN,
        checklist: template ? { create: template.items.map(item => ({ label: item.label, sortOrder: item.sortOrder })) } : undefined,
      } });
    });

    await deletePrivateObject(replacedPhotoKey);

    revalidatePath("/jobs");
    redirect(`/jobs/${job.id}`);
  });
}

export async function assignTechnician(jobId: string, form: FormData) {
  return formAction(async () => {
    await assertRole(editors);
    const technicianId = String(form.get("technicianId") || "") || null;
    if (technicianId) {
      const tech = await db.user.findUnique({ where: { id: technicianId } });
      if (!tech || tech.role !== Role.TECHNICIAN || !tech.active) throw new UserError("Choose an active technician.");
    }
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job || job.status === JobStatus.COMPLETED) throw new UserError("This job cannot be assigned.");
    await db.job.update({ where: { id: jobId }, data: { technicianId, status: job.status === JobStatus.WAITING_PARTS ? JobStatus.WAITING_PARTS : technicianId ? JobStatus.IN_PROGRESS : JobStatus.OPEN } });
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
  });
}

export async function updateFindings(jobId: string, form: FormData) {
  return formAction(async () => {
    await assertRole(editors);
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job || job.status === JobStatus.COMPLETED) throw new UserError("This job is closed.");
    await db.job.update({ where: { id: jobId }, data: { findings: String(form.get("findings") || "").trim().slice(0, 10000) } });
    revalidatePath(`/jobs/${jobId}`);
  });
}

export async function updateComplaint(jobId: string, form: FormData) {
  return resultAction(async () => {
    await assertRole(editors);
    const complaint = text(form.get("complaint"), "Customer complaint", 3000);
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) throw new UserError("Job not found.");
    if (job.status === JobStatus.COMPLETED) {
      throw new UserError("Customer complaint cannot be edited after job completion.");
    }
    await db.job.update({
      where: { id: jobId },
      data: { complaint },
    });
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    revalidatePath(`/customers/${job.customerId}`);
  });
}

export async function saveInspectionChecklist(jobId: string, form: FormData) {
  return formAction(async () => {
    await assertRole(editors);
    if (!form.has("mileage")) throw new UserError("Mileage is missing from the checklist.");
    const raw = String(form.get("mileage") || "").trim();
    const mileage = raw ? Number(raw) : null;
    if (mileage !== null && (!Number.isSafeInteger(mileage) || mileage < 0 || mileage > 2147483647)) {
      throw new UserError("Mileage must be a valid whole number.");
    }
    await db.$transaction(async tx => {
      const job = await tx.job.findUnique({ where: { id: jobId }, include: { checklist: true } });
      if (!job || job.status === JobStatus.COMPLETED) throw new UserError("This checklist cannot be edited.");
      const updates = job.checklist.map(item => {
        const resultKey = `result:${item.id}`;
        const noteKey = `note:${item.id}`;
        if (!form.has(resultKey) || !form.has(noteKey)) throw new UserError("A checklist item is missing.");
        const result = String(form.get(resultKey) || "");
        if (result && !["PASS", "ATTENTION", "NOT_APPLICABLE"].includes(result)) throw new UserError("Invalid checklist result.");
        return { id: item.id, result: result || null, note: String(form.get(noteKey) || "").trim().slice(0, 500) || null };
      });
      await tx.job.update({ where: { id: jobId }, data: { mileage } });
      for (const update of updates) {
        await tx.jobChecklistItem.update({ where: { id: update.id }, data: { result: update.result, note: update.note } });
      }
    });
    revalidatePath(`/jobs/${jobId}`);
  });
}

export async function requestPart(jobId: string, form: FormData) {
  return formAction(async () => {
    await assertRole(editors);
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job || job.status === JobStatus.COMPLETED) throw new UserError("This job is closed.");
    const partId = text(form.get("partId"), "Part");
    const part = await db.part.findUnique({ where: { id: partId } });
    if (!part?.active) throw new UserError("Choose an active part.");
    await db.partRequest.create({ data: {
      jobId, partId,
      requestedQty: positiveInt(form.get("quantity"), "Quantity"),
      note: String(form.get("note") || "").trim().slice(0, 500) || null,
    } });
    await db.job.update({ where: { id: jobId }, data: { status: JobStatus.WAITING_PARTS } });
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/finance");
  });
}

export async function closeJob(jobId: string) {
  return formAction(async () => {
    await assertRole(editors);
    const job = await db.job.findUnique({ where: { id: jobId }, include: { partRequests: true } });
    if (!job || job.status === JobStatus.COMPLETED) throw new UserError("Job is already closed.");
    if (job.partRequests.some(request => request.status === "REQUESTED" || request.status === "APPROVED")) throw new UserError("Resolve open part requests before closing this job.");
    await db.job.update({ where: { id: jobId }, data: { status: JobStatus.COMPLETED, closedAt: new Date() } });
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    revalidatePath("/finance");
  });
}

export async function uploadVehiclePhoto(vehicleId: string, form: FormData) {
  return formAction(async () => {
    await assertRole(editors);
    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new UserError("Vehicle not found.");

    const photo = await readVehiclePhoto(form.get("vehiclePhoto"));
    if (!photo) throw new UserError("No photo provided.");
    const key = `vehicles/${vehicleId}/${randomUUID()}.${photo.ext}`;
    await putPrivateObject(key, photo.bytes);
    await db.vehicle.update({ where: { id: vehicleId }, data: { photoKey: key } });
    await deletePrivateObject(vehicle.photoKey);

    revalidatePath(`/customers/${vehicle.customerId}`);
    revalidatePath("/jobs");
  });
}

