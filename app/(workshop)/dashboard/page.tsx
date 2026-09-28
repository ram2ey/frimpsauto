import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

export default async function Dashboard() {
  const user = await requireUser();
  const jobWhere = user.role === Role.TECHNICIAN ? { technicianId: user.id } : {};
  const [jobs, open, waiting, customers, requests, invoices] = await Promise.all([
    db.job.findMany({ where: jobWhere, include: { customer: true, vehicle: { include: { model: true } }, technician: true }, orderBy: { createdAt: "desc" }, take: 7 }),
    db.job.count({ where: { ...jobWhere, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.job.count({ where: { ...jobWhere, status: "WAITING_PARTS" } }),
    user.role === Role.TECHNICIAN ? Promise.resolve(0) : db.customer.count(),
    user.role === Role.TECHNICIAN ? Promise.resolve(0) : db.partRequest.count({ where: { status: "REQUESTED" } }),
    user.role === Role.FINANCE || user.role === Role.ADMIN ? db.invoice.findMany({ include: { items: true, payments: true } }) : Promise.resolve([]),
  ]);
  const outstanding = invoices.filter(invoice => invoice.status !== "DRAFT").reduce((sum, invoice) => sum + invoice.items.reduce((s, i) => s + i.quantity * i.unitCents, 0) - invoice.payments.reduce((s, p) => s + p.amountCents, 0), 0);
  return <main className="content">
    <div className="hero mb"><div><div className="eyebrow" style={{ color: "#9dcfc8" }}>Workshop overview</div><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p className="subtitle">Keep every Mercedes-Benz service moving with confidence.</p></div><div className="hero-art"/></div>
    <div className="grid four mb"><div className="card stat"><div className="label">Active jobs</div><div className="value">{open}</div><small>Open or in progress</small></div><div className="card stat"><div className="label">Waiting for parts</div><div className="value">{waiting}</div><small>Requires attention</small></div><div className="card stat"><div className="label">{user.role === Role.TECHNICIAN ? "Assigned to you" : "Customers"}</div><div className="value">{user.role === Role.TECHNICIAN ? jobs.length : customers}</div><small>{user.role === Role.TECHNICIAN ? "Recent assignments" : "On record"}</small></div><div className="card stat"><div className="label">{user.role === Role.FINANCE || user.role === Role.ADMIN ? "Outstanding" : "Part requests"}</div><div className="value">{user.role === Role.FINANCE || user.role === Role.ADMIN ? money(outstanding) : requests}</div><small>{user.role === Role.FINANCE || user.role === Role.ADMIN ? "Across invoices" : "Awaiting finance"}</small></div></div>
    <section className="card"><div className="section-title"><div><div className="eyebrow">Activity</div><h2>Recent job orders</h2></div><div className="row"><Link className="btn btn-secondary btn-small" href="/jobs">View all <ArrowUpRight size={14}/></Link>{(user.role === Role.SUPERVISOR || user.role === Role.ADMIN) && <Link className="btn btn-primary btn-small" href="/jobs/new"><Plus size={14}/> New job</Link>}</div></div><div className="table-wrap"><table className="table"><thead><tr><th>Job</th><th>Customer</th><th>Vehicle</th><th>Technician</th><th>Status</th><th>Created</th></tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td><Link className="text-link" href={`/jobs/${job.id}`}>#{String(job.number).padStart(5,"0")}</Link></td><td>{job.customer.name}</td><td>{job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}</td><td>{job.technician?.name || "Unassigned"}</td><td><span className={`pill ${job.status.toLowerCase()}`}>{job.status.replaceAll("_"," ").toLowerCase()}</span></td><td>{date(job.createdAt)}</td></tr>)}</tbody></table>{!jobs.length && <div className="empty">No jobs yet. Create your first job order to get started.</div>}</div></section>
  </main>;
}
