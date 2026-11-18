"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { JobStatus, Role } from "@/generated/prisma/client";
import { formAction, serializable } from "@/lib/action";
import { assertRole } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { positiveInt, text } from "@/lib/format";
import { deletePrivateObject, putPrivateObject, readVehiclePhoto } from "@/lib/storage";

const editors = [Role.SUPERVISOR];

const MAX_ISSUES = 50;
const issueKey = (label: string) => label.toLowerCase().replace(/\s+/g, " ").trim();

/** Splits free text into issues: one per line, list markers stripped, blanks and repeats dropped. */
function parseIssueLines(value: FormDataEntryValue | null) {
  const seen = new Set<string>();
  const labels = String(value || "")
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(label => {
      const key = issueKey(label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (labels.some(label => label.length > 300)) throw new UserError("Each issue must be 300 characters or fewer.");
  return labels;
}

export async function createJob(form: FormData) {
  return formAction(async () => {
    const actor = await assertRole(editors);
    const issues = parseIssueLines(form.get("issues"));
    if (!issues.length) throw new UserError("List at least one issue for the technician, one per line.");
    if (issues.length > MAX_ISSUES) throw new UserError(`A job can list at most ${MAX_ISSUES} issues.`);
    // The job's description keeps the original list, so customer history search still finds it.
    const complaint = issues.join("\n").slice(0, 3000);
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
        issues: { create: issues.map((label, sortOrder) => ({ label, sortOrder })) },
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

const ISSUE_STATUSES = ["FIXED", "PARTIAL", "NOT_FIXED"] as const;

/**
 * Supervisor adds issues as free text, one per line. Existing issues are never changed
 * here, so the technician's answers are always kept. Lines already on the list are skipped.
 */
export async function addIssues(jobId: string, form: FormData) {
  return formAction(async () => {
    await assertRole(editors);
    const labels = parseIssueLines(form.get("issues"));
    if (!labels.length) throw new UserError("Type at least one issue, one per line.");

    await serializable(async tx => {
      const job = await tx.job.findUnique({ where: { id: jobId }, include: { issues: true } });
      if (!job || job.status === JobStatus.COMPLETED) throw new UserError("This job is closed.");
      const seen = new Set(job.issues.map(issue => issueKey(issue.label)));
      const fresh = labels.filter(label => {
        const key = issueKey(label);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!fresh.length) throw new UserError("Those issues are already on the list.");
      if (job.issues.length + fresh.length > MAX_ISSUES) throw new UserError(`A job can list at most ${MAX_ISSUES} issues.`);
      const start = job.issues.reduce((max, issue) => Math.max(max, issue.sortOrder + 1), 0);
      await tx.jobIssue.createMany({ data: fresh.map((label, index) => ({ jobId, label, sortOrder: start + index })) });
    });
    revalidatePath(`/jobs/${jobId}`);
  });
}

/** Supervisor removes an issue, but only before the technician has reported on it. */
export async function removeIssue(issueId: string) {
  return formAction(async () => {
    await assertRole(editors);
    const jobId = await serializable(async tx => {
      const issue = await tx.jobIssue.findUnique({ where: { id: issueId }, include: { job: true } });
      if (!issue) throw new UserError("That issue no longer exists.");
      if (issue.job.status === JobStatus.COMPLETED) throw new UserError("This job is closed.");
      if (issue.status || issue.note) throw new UserError("The technician has already reported on this issue, so it can't be removed.");
      await tx.jobIssue.delete({ where: { id: issueId } });
      return issue.jobId;
    });
    revalidatePath(`/jobs/${jobId}`);
  });
}

/**
 * Assigned technician (or supervisor/admin) records what was and wasn't fixed.
 * The technician's "Other notes" can only be written by the technician.
 */
export async function saveIssueReport(jobId: string, form: FormData) {
  return formAction(async () => {
    const actor = await assertRole([Role.SUPERVISOR, Role.TECHNICIAN]);
    const isTechnician = actor.role === Role.TECHNICIAN;
    const workNotes = String(form.get("workNotes") || "").trim().slice(0, 5000) || null;
    await serializable(async tx => {
      const job = await tx.job.findUnique({ where: { id: jobId }, include: { issues: true } });
      if (!job || (isTechnician && job.technicianId !== actor.id)) throw new UserError("Job not found.");
      if (job.status === JobStatus.COMPLETED) throw new UserError("This job is closed.");
      const now = new Date();
      for (const issue of job.issues) {
        const rawStatus = String(form.get(`status:${issue.id}`) || "");
        if (rawStatus && !(ISSUE_STATUSES as readonly string[]).includes(rawStatus)) throw new UserError("Invalid issue status.");
        const status = (rawStatus || null) as (typeof ISSUE_STATUSES)[number] | null;
        const note = String(form.get(`note:${issue.id}`) || "").trim().slice(0, 500) || null;
        if (status === issue.status && note === issue.note) continue;
        await tx.jobIssue.update({ where: { id: issue.id }, data: { status, note, reportedById: actor.id, reportedAt: now } });
      }
      if (isTechnician && workNotes !== job.workNotes) await tx.job.update({ where: { id: jobId }, data: { workNotes } });
    });
    revalidatePath(`/jobs/${jobId}`);
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
    const job = await db.job.findUnique({ where: { id: jobId }, include: { partRequests: true, issues: true } });
    if (!job || job.status === JobStatus.COMPLETED) throw new UserError("Job is already closed.");
    if (job.partRequests.some(request => request.status === "REQUESTED" || request.status === "APPROVED")) throw new UserError("Resolve open part requests before closing this job.");
    if (job.issues.some(issue => !issue.status)) throw new UserError("Every issue needs a technician report (fixed, partly fixed or not fixed) before closing this job.");
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

