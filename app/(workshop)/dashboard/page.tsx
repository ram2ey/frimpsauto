import Link from "next/link";
import { ArrowUpRight, Plus, ArrowRight, Wrench } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

const statuses = [
  { value: "OPEN", label: "Open", color: "#78b1d8" },
  { value: "IN_PROGRESS", label: "In progress", color: "#0860a0" },
  { value: "WAITING_PARTS", label: "Waiting for parts", color: "#ac792d" },
  { value: "COMPLETED", label: "Completed", color: "#32735a" },
] as const;

export default async function Dashboard() {
  const user = await requireUser();
  const technician = user.role === Role.TECHNICIAN;
  const canCreate = user.role === Role.SUPERVISOR || user.role === Role.ADMIN;
  const financial = user.role === Role.FINANCE || user.role === Role.ADMIN;
  const jobWhere = technician ? { technicianId: user.id } : {};
  const [jobs, groupedJobs, customers, requests, invoices] = await Promise.all([
    db.job.findMany({
      where: jobWhere,
      include: { customer: true, vehicle: { include: { model: true } }, technician: true },
      orderBy: [{ createdAt: "desc" }, { number: "desc" }],
      take: 10,
    }),
    db.job.groupBy({ by: ["status"], where: jobWhere, _count: { _all: true } }),
    technician ? Promise.resolve(0) : db.customer.count(),
    db.partRequest.count({ where: { status: "REQUESTED", ...(technician ? { job: { technicianId: user.id } } : {}) } }),
    financial ? db.invoice.findMany({ include: { items: true, payments: true } }) : Promise.resolve([]),
  ]);

  const workload = statuses.map(status => ({
    ...status,
    count: groupedJobs.find(group => group.status === status.value)?._count._all || 0,
  }));
  const total = workload.reduce((sum, status) => sum + status.count, 0);
  const active = workload[0].count + workload[1].count;
  const waiting = workload[2].count;
  const outstanding = invoices
    .filter(invoice => invoice.status !== "DRAFT")
    .reduce((sum, invoice) => sum + invoice.items.reduce((s, i) => s + i.quantity * i.unitCents, 0) - invoice.payments.reduce((s, p) => s + p.amountCents, 0), 0);

  return (
    <main className="content dashboard">
      <div className="page-head dashboard-heading">
        <div>
          <h1>Overview</h1>
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" href="/jobs">
            Job orders <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          {canCreate && (
            <Link className="btn btn-primary" href="/jobs/new">
              <Plus size={16} aria-hidden="true" /> New job
            </Link>
          )}
        </div>
      </div>

      <section className="metrics-strip" aria-label="Workshop summary">
        <div className="stat">
          <div className="label">Active jobs</div>
          <div className="value">{active}</div>
        </div>
        <div className="stat">
          <div className="label">Waiting for parts</div>
          <div className="value">{waiting}</div>
        </div>
        <div className="stat">
          <div className="label">{technician ? "Assigned to you" : "Customers"}</div>
          <div className="value">{technician ? total : customers}</div>
        </div>
        <div className="stat">
          <div className="label">{financial ? "Outstanding" : "Part requests"}</div>
          <div className="value money-value">{financial ? money(outstanding) : requests}</div>
        </div>
      </section>

      <div className="dashboard-lower">
        <section className="card recent-jobs">
          <div className="section-title">
            <div>
              <h2>Recent job orders</h2>
            </div>
            <Link className="btn btn-secondary btn-small" href="/jobs">
              View all <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Job</th>
                  <th scope="col">Customer / Vehicle</th>
                  <th scope="col">Technician</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td>
                      <Link className="job-number" href={`/jobs/${job.id}`}>
                        #{String(job.number).padStart(5, "0")}
                      </Link>
                    </td>
                    <td>
                      <span className="table-primary">{job.customer.name}</span>
                      <small>
                        {job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}
                        {job.vehicle.plate ? ` · ${job.vehicle.plate}` : ""}
                      </small>
                    </td>
                    <td>{job.technician?.name || <span className="muted">Unassigned</span>}</td>
                    <td>
                      <span className={`pill ${job.status.toLowerCase()}`}>
                        {job.status.replaceAll("_", " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="date-cell">{date(job.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!jobs.length && (
              <div className="empty">
                {technician
                  ? "No jobs have been assigned to you yet."
                  : "Your recent job orders will appear here."}
              </div>
            )}
          </div>
        </section>

        <section className="card workload">
          <div className="section-title">
            <h2>Job status</h2>
            <span className="round-icon">
              <Wrench size={15} strokeWidth={1.5} aria-hidden="true" />
            </span>
          </div>

          <div className="workload-summary">
            <div className="workload-total">
              <span>{technician ? "Assigned jobs" : "Total workshop jobs"}</span>
              <strong>{total}</strong>
            </div>
            <div className="workload-bar" aria-hidden="true">
              {workload.map(status =>
                total > 0 && status.count > 0 ? (
                  <span
                    key={status.value}
                    style={{ width: `${(status.count / total) * 100}%`, background: status.color }}
                    title={`${status.label}: ${status.count}`}
                  />
                ) : null
              )}
            </div>
          </div>

          <ul className="workload-legend">
            {workload.map(status => (
              <li key={status.value}>
                <Link href={`/jobs?status=${status.value}`}>
                  <span className="legend-dot" style={{ background: status.color }} aria-hidden="true" />
                  <span>{status.label}</span>
                  <strong>{status.count}</strong>
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
