import Link from "next/link";
import { ArrowUpRight, Plus, CarFront, ArrowRight, Wrench } from "lucide-react";
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
    db.job.findMany({ where: jobWhere, include: { customer: true, vehicle: { include: { model: true } }, technician: true }, orderBy: [{ createdAt: "desc" }, { number: "desc" }], take: 7 }),
    db.job.groupBy({ by: ["status"], where: jobWhere, _count: { _all: true } }),
    technician ? Promise.resolve(0) : db.customer.count(),
    db.partRequest.count({ where: { status: "REQUESTED", ...(technician ? { job: { technicianId: user.id } } : {}) } }),
    financial ? db.invoice.findMany({ include: { items: true, payments: true } }) : Promise.resolve([]),
  ]);
  const workload = statuses.map(status => ({ ...status, count: groupedJobs.find(group => group.status === status.value)?._count._all || 0 }));
  const total = workload.reduce((sum, status) => sum + status.count, 0);
  const active = workload[0].count + workload[1].count;
  const waiting = workload[2].count;
  const outstanding = invoices.filter(invoice => invoice.status !== "DRAFT").reduce((sum, invoice) => sum + invoice.items.reduce((s, i) => s + i.quantity * i.unitCents, 0) - invoice.payments.reduce((s, p) => s + p.amountCents, 0), 0);
  let angle = 0;
  const segments = workload.map(status => {
    const start = angle;
    angle += total ? status.count / total * 360 : 0;
    return `${status.color} ${start}deg ${angle}deg`;
  });

  return <main className="content dashboard">
    <div className="page-head dashboard-heading">
      <div><div className="eyebrow">A little clarity. Every day.</div><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p className="subtitle">Your workshop, at a glance.</p></div>
      <div className="actions"><Link className="btn btn-secondary" href="/jobs">Job orders <ArrowUpRight size={16} aria-hidden="true" /></Link>{canCreate && <Link className="btn btn-primary" href="/jobs/new"><Plus size={16} aria-hidden="true" /> New job</Link>}</div>
    </div>

    <section className="featured-jobs" aria-labelledby="featured-title">
      <div className="feature-caption"><span id="featured-title">Latest in the workshop</span><span>Mercedes-Benz specialists</span></div>
      {jobs.length ? <div className={`job-deck deck-${Math.min(jobs.length, 3)}`}>
        {jobs.slice(0, 3).map(job => <Link href={`/jobs/${job.id}`} className="job-feature" key={job.id}>
          <div className="feature-top"><span>Job / {String(job.number).padStart(5, "0")}</span><span className="feature-icon"><CarFront size={21} strokeWidth={1.4} aria-hidden="true" /></span></div>
          <div className="feature-vehicle"><span className="feature-year">Mercedes-Benz · {job.vehicle.year}</span><h2>{job.vehicle.model?.name || job.vehicle.customModel || "Vehicle"}</h2><p>{job.customer.name}</p></div>
          <div className="feature-bottom"><span className={`pill ${job.status.toLowerCase()}`}>{job.status.replaceAll("_", " ").toLowerCase()}</span><span className="feature-arrow"><ArrowUpRight size={18} aria-hidden="true" /></span></div>
        </Link>)}
      </div> : <div className="feature-empty"><span className="feature-icon"><Wrench size={26} strokeWidth={1.3} aria-hidden="true" /></span><h2>{technician ? "Your next assignment starts here." : "Ready for the first arrival."}</h2><p>{canCreate ? "Create a job order to bring your workshop into view." : "Job orders will appear here when they are available to you."}</p>{canCreate && <Link className="btn btn-primary" href="/jobs/new"><Plus size={16} aria-hidden="true" /> Create a job order</Link>}</div>}
    </section>

    <section className="metrics-strip" aria-label="Workshop summary">
      <div className="stat"><div className="label">Active jobs</div><div className="value">{active}</div><small>Open or in progress</small></div>
      <div className="stat"><div className="label">Waiting for parts</div><div className="value">{waiting}</div><small>Requires attention</small></div>
      <div className="stat"><div className="label">{technician ? "Assigned to you" : "Customers"}</div><div className="value">{technician ? total : customers}</div><small>{technician ? "Across all job statuses" : "People we look after"}</small></div>
      <div className="stat"><div className="label">{financial ? "Outstanding" : "Part requests"}</div><div className="value money-value">{financial ? money(outstanding) : requests}</div><small>{financial ? "Across issued invoices" : "Awaiting approval"}</small></div>
    </section>

    <div className="dashboard-lower">
      <section className="card recent-jobs"><div className="section-title"><div><div className="eyebrow">The latest activity</div><h2>Recent job orders</h2></div><Link className="btn btn-secondary btn-small" href="/jobs">View all <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
        <div className="table-wrap"><table className="table"><thead><tr><th scope="col">Job</th><th scope="col">Customer / Vehicle</th><th scope="col">Technician</th><th scope="col">Status</th><th scope="col">Created</th></tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td><Link className="job-number" href={`/jobs/${job.id}`}>#{String(job.number).padStart(5, "0")}</Link></td><td><span className="table-primary">{job.customer.name}</span><small>{job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}</small></td><td>{job.technician?.name || <span className="muted">Unassigned</span>}</td><td><span className={`pill ${job.status.toLowerCase()}`}>{job.status.replaceAll("_", " ").toLowerCase()}</span></td><td className="date-cell">{date(job.createdAt)}</td></tr>)}</tbody></table>{!jobs.length && <div className="empty">{technician ? "No jobs have been assigned to you yet." : "Your recent job orders will appear here."}</div>}</div>
      </section>
      <section className="card workload"><div className="section-title"><h2>Workshop flow</h2><span className="round-icon"><Wrench size={15} strokeWidth={1.5} aria-hidden="true" /></span></div><p className="hint">{technician ? "Your assignments by status" : "All job orders by status"}</p>
        <div className="workload-chart" aria-hidden="true" style={{ background: total ? `conic-gradient(${segments.join(",")})` : "#d2e4f0" }}><div><span>{total}</span><small>{technician ? "assigned jobs" : "total jobs"}</small></div></div>
        <ul className="workload-legend">{workload.map(status => <li key={status.value}><Link href={`/jobs?status=${status.value}`}><span className="legend-dot" style={{ background: status.color }} aria-hidden="true" /><span>{status.label}</span><strong>{status.count}</strong><ArrowRight size={13} aria-hidden="true" /></Link></li>)}</ul>
        <div className="workload-note">{total ? `${active} ${active === 1 ? "job" : "jobs"} moving through the workshop.` : "A clear view, from arrival to completion."}</div>
      </section>
    </div>
  </main>;
}
