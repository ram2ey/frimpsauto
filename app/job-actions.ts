"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { JobStatus, Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { positiveInt, text } from "@/lib/format";
import { putPrivateObject } from "@/lib/storage";

const editors = [Role.SUPERVISOR];

export async function createJob(form: FormData) {
  const actor = await assertRole(editors);
  const complaint = text(form.get("complaint"), "Customer complaint", 3000);
  const technicianId = String(form.get("technicianId") || "") || null;
  if (technicianId) {
    const tech = await db.user.findUnique({ where: { id: technicianId } });
    if (!tech || tech.role !== Role.TECHNICIAN || !tech.active) throw new Error("Choose an active technician.");
  }
  const existingVehicleId = String(form.get("existingVehicleId") || "");
  const existingCustomerId = String(form.get("existingCustomerId") || "");
  const year = existingVehicleId ? null : positiveInt(form.get("year"), "Model year");
  if (year && (year < 1926 || year > new Date().getFullYear() + 1)) throw new Error("Choose a valid Mercedes-Benz model year.");
  const modelName = existingVehicleId ? null : text(form.get("modelName"), "Vehicle model", 120);
  const customerName = !existingVehicleId && !existingCustomerId ? text(form.get("customerName"), "Customer name", 120) : null;
  const customerPhone = !existingVehicleId && !existingCustomerId ? text(form.get("customerPhone"), "Phone", 50) : null;
  const templateId = String(form.get("templateId") || "");
  const template = templateId ? await db.checklistTemplate.findUnique({ where: { id: templateId }, include: { items: { orderBy: { sortOrder: "asc" } } } }) : null;
  if (templateId && (!template || !template.active)) throw new Error("Choose an active checklist template.");

  // Process optional vehicle photo
  const photoFile = form.get("vehiclePhoto") as File | null;
  let photoData: { key: string; buffer: Uint8Array } | null = null;
  if (photoFile && photoFile.size > 0 && photoFile.size <= 10 * 1024 * 1024) {
    const mime = photoFile.type.toLowerCase();
    let ext: string | null = null;
    if (mime === "image/png") ext = "png";
    else if (mime === "image/webp") ext = "webp";
    else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
    if (ext) {
      const buffer = new Uint8Array(await photoFile.arrayBuffer());
      const tempId = randomUUID();
      photoData = { key: `vehicles/${tempId}/${randomUUID()}.${ext}`, buffer };
    }
  }

  const job = await db.$transaction(async tx => {
    let customerId: string;
    let vehicleId: string;
    if (existingVehicleId) {
      const vehicle = await tx.vehicle.findUnique({ where: { id: existingVehicleId } });
      if (!vehicle || (existingCustomerId && vehicle.customerId !== existingCustomerId)) throw new Error("Vehicle not found for this customer.");
      customerId = vehicle.customerId;
      vehicleId = vehicle.id;
      if (photoData) {
        await tx.vehicle.update({ where: { id: existingVehicleId }, data: { photoKey: photoData.key } });
      }
    } else {
      if (existingCustomerId) {
        const customer = await tx.customer.findUnique({ where: { id: existingCustomerId } });
        if (!customer) throw new Error("Customer not found.");
        customerId = customer.id;
      } else {
        const customer = await tx.customer.create({ data: { name: customerName!, phone: customerPhone!, email: String(form.get("customerEmail") || "").trim() || null } });
        customerId = customer.id;
      }
      const catalogModel = await tx.vehicleModel.findFirst({ where: { name: { equals: modelName!, mode: "insensitive" } } });
      const vehicle = await tx.vehicle.create({ data: {
        customerId, year: year!, modelId: catalogModel?.id || null,
        customModel: catalogModel ? null : modelName,
        vin: String(form.get("vin") || "").trim().toUpperCase() || null,
        plate: String(form.get("plate") || "").trim().toUpperCase() || null,
        color: String(form.get("color") || "").trim() || null,
        photoKey: photoData?.key || null,
      } });
      vehicleId = vehicle.id;
    }
    return tx.job.create({ data: {
      customerId, vehicleId, complaint, createdById: actor.id, technicianId,
      status: technicianId ? JobStatus.IN_PROGRESS : JobStatus.OPEN,
      checklist: template ? { create: template.items.map(item => ({ label: item.label, sortOrder: item.sortOrder })) } : undefined,
    } });
  });

  if (photoData) {
    await putPrivateObject(photoData.key, photoData.buffer);
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function assignTechnician(jobId: string, form: FormData) {
  await assertRole(editors);
  const technicianId = String(form.get("technicianId") || "") || null;
  if (technicianId) {
    const tech = await db.user.findUnique({ where: { id: technicianId } });
    if (!tech || tech.role !== Role.TECHNICIAN || !tech.active) throw new Error("Choose an active technician.");
  }
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.status === JobStatus.COMPLETED) throw new Error("This job cannot be assigned.");
  await db.job.update({ where: { id: jobId }, data: { technicianId, status: job.status === JobStatus.WAITING_PARTS ? JobStatus.WAITING_PARTS : technicianId ? JobStatus.IN_PROGRESS : JobStatus.OPEN } });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}

export async function updateFindings(jobId: string, form: FormData) {
  await assertRole(editors);
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.status === JobStatus.COMPLETED) throw new Error("This job is closed.");
  await db.job.update({ where: { id: jobId }, data: { findings: String(form.get("findings") || "").trim().slice(0, 10000) } });
  revalidatePath(`/jobs/${jobId}`);
}

export async function updateComplaint(jobId: string, form: FormData) {
  await assertRole(editors);
  const complaint = text(form.get("complaint"), "Customer complaint", 3000);
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found.");
  if (job.status === JobStatus.COMPLETED) {
    throw new Error("Customer complaint cannot be edited after job completion.");
  }
  await db.job.update({
    where: { id: jobId },
    data: { complaint },
  });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath(`/customers/${job.customerId}`);
}

export async function saveInspectionChecklist(jobId: string, form: FormData) {
  await assertRole(editors);
  if (!form.has("mileage")) throw new Error("Mileage is missing from the checklist.");
  const raw = String(form.get("mileage") || "").trim();
  const mileage = raw ? Number(raw) : null;
  if (mileage !== null && (!Number.isSafeInteger(mileage) || mileage < 0 || mileage > 2147483647)) {
    throw new Error("Mileage must be a valid whole number.");
  }
  await db.$transaction(async tx => {
    const job = await tx.job.findUnique({ where: { id: jobId }, include: { checklist: true } });
    if (!job || job.status === JobStatus.COMPLETED) throw new Error("This checklist cannot be edited.");
    const updates = job.checklist.map(item => {
      const resultKey = `result:${item.id}`;
      const noteKey = `note:${item.id}`;
      if (!form.has(resultKey) || !form.has(noteKey)) throw new Error("A checklist item is missing.");
      const result = String(form.get(resultKey) || "");
      if (result && !["PASS", "ATTENTION", "NOT_APPLICABLE"].includes(result)) throw new Error("Invalid checklist result.");
      return { id: item.id, result: result || null, note: String(form.get(noteKey) || "").trim().slice(0, 500) || null };
    });
    await tx.job.update({ where: { id: jobId }, data: { mileage } });
    for (const update of updates) {
      await tx.jobChecklistItem.update({ where: { id: update.id }, data: { result: update.result, note: update.note } });
    }
  });
  revalidatePath(`/jobs/${jobId}`);
}

export async function requestPart(jobId: string, form: FormData) {
  await assertRole(editors);
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.status === JobStatus.COMPLETED) throw new Error("This job is closed.");
  const partId = text(form.get("partId"), "Part");
  const part = await db.part.findUnique({ where: { id: partId } });
  if (!part?.active) throw new Error("Choose an active part.");
  await db.partRequest.create({ data: {
    jobId, partId,
    requestedQty: positiveInt(form.get("quantity"), "Quantity"),
    note: String(form.get("note") || "").trim().slice(0, 500) || null,
  } });
  await db.job.update({ where: { id: jobId }, data: { status: JobStatus.WAITING_PARTS } });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/finance");
}

export async function closeJob(jobId: string) {
  await assertRole(editors);
  const job = await db.job.findUnique({ where: { id: jobId }, include: { partRequests: true } });
  if (!job || job.status === JobStatus.COMPLETED) throw new Error("Job is already closed.");
  if (job.partRequests.some(request => request.status === "REQUESTED" || request.status === "APPROVED")) throw new Error("Resolve open part requests before closing this job.");
  await db.job.update({ where: { id: jobId }, data: { status: JobStatus.COMPLETED, closedAt: new Date() } });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/finance");
}

export async function uploadVehiclePhoto(vehicleId: string, form: FormData) {
  await assertRole(editors);
  const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new Error("Vehicle not found.");

  const file = form.get("vehiclePhoto") as File | null;
  if (!file || file.size === 0) throw new Error("No photo provided.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Vehicle photo exceeds the 10 MB limit.");

  const mime = file.type.toLowerCase();
  let ext: string | null = null;
  if (mime === "image/png") ext = "png";
  else if (mime === "image/webp") ext = "webp";
  else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  if (!ext) throw new Error("Only JPEG, PNG, or WebP image files are allowed.");

  const key = `vehicles/${vehicleId}/${randomUUID()}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());
  await putPrivateObject(key, buffer);

  await db.vehicle.update({
    where: { id: vehicleId },
    data: { photoKey: key },
  });

  revalidatePath(`/customers/${vehicle.customerId}`);
  revalidatePath("/jobs");
}

