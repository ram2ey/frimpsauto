import Link from "next/link";
import { Role } from "@/generated/prisma/client";
import { JobIntake } from "@/components/job-intake";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const CUSTOMER_PAGE = 50;

export default async function NewJob({
  searchParams,
}: {
  searchParams?: Promise<{ customerId?: string; vehicleId?: string; q?: string }>;
}) {
  await requireRole([Role.SUPERVISOR]);
  const { customerId, vehicleId, q } = (await searchParams) || {};
  const query = (q || "").trim().slice(0, 100);
  const contains = { contains: query, mode: "insensitive" as const };
  const customerInclude = {
    vehicles: { include: { model: true }, orderBy: { createdAt: "desc" as const } },
    _count: { select: { jobs: true } },
  };
  const [customers, preselected, models, technicians, templates] = await Promise.all([
    // Only a page of customers is sent to the browser; typing in the filter searches the rest.
    db.customer.findMany({
      where: query
        ? { OR: [{ name: contains }, { phone: contains }, { email: contains }, { vehicles: { some: { OR: [{ plate: contains }, { vin: contains }] } } }] }
        : undefined,
      include: customerInclude,
      orderBy: query ? { name: "asc" } : { createdAt: "desc" },
      take: CUSTOMER_PAGE,
    }),
    customerId ? db.customer.findUnique({ where: { id: customerId }, include: customerInclude }) : Promise.resolve(null),
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
        customers={preselected && !customers.some(c => c.id === preselected.id) ? [preselected, ...customers] : customers}
        models={models}
        technicians={technicians}
        templates={templates}
        initialCustomerId={customerId}
        initialVehicleId={vehicleId}
      />
    </main>
  );
}
