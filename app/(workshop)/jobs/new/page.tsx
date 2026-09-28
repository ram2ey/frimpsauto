import Link from "next/link";
import { Role } from "@/generated/prisma/client";
import { JobIntake } from "@/components/job-intake";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function NewJob({
  searchParams,
}: {
  searchParams?: Promise<{ customerId?: string; vehicleId?: string }>;
}) {
  await requireRole([Role.SUPERVISOR]);
  const { customerId, vehicleId } = (await searchParams) || {};
  const [customers, models, technicians, templates] = await Promise.all([
    db.customer.findMany({
      include: {
        vehicles: { include: { model: true }, orderBy: { createdAt: "desc" } },
        _count: { select: { jobs: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.vehicleModel.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: Role.TECHNICIAN, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.checklistTemplate.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>New job order</h1>
        </div>
        <Link className="btn btn-secondary" href="/jobs">Back to jobs</Link>
      </div>
      <JobIntake
        customers={customers}
        models={models}
        technicians={technicians}
        templates={templates}
        initialCustomerId={customerId}
        initialVehicleId={vehicleId}
      />
    </main>
  );
}
