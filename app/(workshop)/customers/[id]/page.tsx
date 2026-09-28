import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import { CustomerProfileCard } from "@/components/customer-profile-card";
import { VehicleCard } from "@/components/vehicle-card";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([Role.SUPERVISOR, Role.FINANCE]);
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      vehicles: { include: { model: true }, orderBy: { createdAt: "desc" } },
      jobs: { include: { vehicle: { include: { model: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!customer) notFound();

  const edit = user.role === Role.SUPERVISOR || user.role === Role.ADMIN;
  const models = edit ? await db.vehicleModel.findMany({ orderBy: { name: "asc" } }) : [];

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow">Customers</div>
          <h1>{customer.name}</h1>
          <p className="subtitle">
            <a href={`tel:${customer.phone}`} className="text-link">{customer.phone}</a> · {customer.vehicles.length} vehicle{customer.vehicles.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" href="/customers">All customers</Link>
          {edit && (
            <Link className="btn btn-primary" href={`/jobs/new?customerId=${customer.id}`}>
              <Plus size={16} aria-hidden="true" /> New job intake
            </Link>
          )}
        </div>
      </div>

      <div className="grid two mb">
        <CustomerProfileCard
          id={id}
          name={customer.name}
          phone={customer.phone}
          email={customer.email}
          notes={customer.notes}
          edit={edit}
        />

        <section className="card">
          <div className="section-title">
            <h2>Recent jobs</h2>
            <span className="pill">{customer.jobs.length} visits</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Vehicle</th>
                  <th>Opened</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.jobs.map(job => (
                  <tr key={job.id}>
                    <td>
                      <Link className="job-number" href={`/jobs/${job.id}`}>
                        #{String(job.number).padStart(5, "0")}
                      </Link>
                    </td>
                    <td>
                      <small>
                        {job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}
                      </small>
                    </td>
                    <td className="date-cell">{date(job.createdAt)}</td>
                    <td>
                      <span className={`pill ${job.status.toLowerCase()}`}>
                        {job.status.replaceAll("_", " ").toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!customer.jobs.length && <div className="empty">No service history yet for this customer.</div>}
          </div>
        </section>
      </div>

      <section className="mt">
        <div className="section-title">
          <div>
            <h2>Registered vehicles</h2>
          </div>
          <span className="pill">{customer.vehicles.length} registered</span>
        </div>
        <div className="grid two">
          {customer.vehicles.map(vehicle => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              customerId={customer.id}
              models={models}
              edit={edit}
            />
          ))}
          {!customer.vehicles.length && (
            <div className="card empty" style={{ gridColumn: "1 / -1" }}>
              No vehicles registered for this customer yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
