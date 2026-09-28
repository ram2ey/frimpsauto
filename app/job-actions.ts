"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { JobStatus, Role } from "@/generated/prisma/client";
import { assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { positiveInt, text } from "@/lib/format";

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
  const mileageRaw = String(form.get("mileage") || "").trim();
  const mileage = mileageRaw ? Number(mileageRaw) : null;
  if (mileage !== null && (!Number.isSafeInteger(mileage) || mileage < 0)) throw new Error("Mileage must be a whole number.");
  const customerName = !existingVehicleId && !existingCustomerId ? text(form.get("customerName"), "Customer name", 120) : null;
  const customerPhone = !existingVehicleId && !existingCustomerId ? text(form.get("customerPhone"), "Phone", 50) : null;
  const templateId = String(form.get("templateId") || "");
  const template = templateId ? await db.checklistTemplate.findUnique({ where: { id: templateId }, include: { items: { orderBy: { sortOrder: "asc" } } } }) : null;
  if (templateId && (!template || !template.active)) throw new Error("Choose an active checklist template.");
  const job = await db.$transaction(async tx => {
    let customerId: string;
    let vehicleId: string;
    if (existingVehicleId) {
      const vehicle = await tx.vehicle.findUnique({ where: { id: existingVehicleId } });
      if (!vehicle || (existingCustomerId && vehicle.customerId !== existingCustomerId)) throw new Error("Vehicle not found for this customer.");
      customerId = vehicle.customerId;
      vehicleId = vehicle.id;
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
        mileage,
      } });
      vehicleId = vehicle.id;
    }
    return tx.job.create({ data: {
      customerId, vehicleId, complaint, createdById: actor.id, technicianId,
      status: technicianId ? JobStatus.IN_PROGRESS : JobStatus.OPEN,
      checklist: template ? { create: template.items.map(item => ({ label: item.label, sortOrder: item.sortOrder })) } : undefined,
    } });
  });
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

export async function updateChecklist(itemId: string, form: FormData) {
  await assertRole(editors);
  const item = await db.jobChecklistItem.findUnique({ where: { id: itemId }, include: { job: true } });
  if (!item || item.job.status === JobStatus.COMPLETED) throw new Error("This checklist cannot be edited.");
  const result = String(form.get("result") || "");
  if (result && !["PASS", "ATTENTION", "NOT_APPLICABLE"].includes(result)) throw new Error("Invalid checklist result.");
  await db.jobChecklistItem.update({ where: { id: itemId }, data: { result: result || null, note: String(form.get("note") || "").trim().slice(0, 500) || null } });
  revalidatePath(`/jobs/${item.jobId}`);
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
