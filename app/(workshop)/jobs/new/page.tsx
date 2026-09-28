import Link from "next/link";
import { Role } from "@/generated/prisma/client";
import { JobIntake } from "@/components/job-intake";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function NewJob() {
  await requireRole([Role.SUPERVISOR]);
  const [customers, models, technicians, templates] = await Promise.all([
    db.customer.findMany({ include: { vehicles: { include: { model: true }, orderBy: { createdAt: "desc" } } }, orderBy: { name: "asc" } }),
    db.vehicleModel.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: Role.TECHNICIAN, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.checklistTemplate.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <main className="content"><div className="page-head"><div><div className="eyebrow">Workshop / Job orders</div><h1>New job order</h1><p className="subtitle">Record the customer, vehicle and reason for visiting.</p></div><Link className="btn btn-secondary" href="/jobs">Back to jobs</Link></div><JobIntake customers={customers} models={models} technicians={technicians} templates={templates}/></main>;
}
