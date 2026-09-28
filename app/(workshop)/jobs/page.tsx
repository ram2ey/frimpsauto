import Link from "next/link";
import { Plus } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";

export default async function Jobs({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requireUser();
  const { status, q } = await searchParams;
  const allowed = ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED"];
  const jobs = await db.job.findMany({
    where: {
      ...(user.role === Role.TECHNICIAN ? { technicianId: user.id } : {}),
      ...(status && allowed.includes(status) ? { status: status as "OPEN" | "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED" } : {}),
      ...(q ? { OR: [ { customer: { name: { contains: q, mode: "insensitive" } } }, { vehicle: { plate: { contains: q, mode: "insensitive" } } }, { vehicle: { vin: { contains: q, mode: "insensitive" } } } ] } : {}),
    },
    include: { customer: true, vehicle: { include: { model: true } }, technician: true },
    orderBy: { createdAt: "desc" },
  });
  return <main className="content"><div className="page-head"><div><div className="eyebrow">Workshop</div><h1>Job orders</h1><p className="subtitle">{user.role === Role.TECHNICIAN ? "Jobs assigned to you" : "Track every vehicle through the workshop"}</p></div>{(user.role === Role.ADMIN || user.role === Role.SUPERVISOR) && <Link href="/jobs/new" className="btn btn-primary"><Plus size={17}/> New job order</Link>}</div>
    <section className="card"><form className="row wrap mb" action="/jobs"><div style={{ width: 260 }}><label htmlFor="q">Search customer, VIN or plate</label><input id="q" name="q" defaultValue={q || ""} placeholder="Search jobs"/></div><div style={{ width: 180 }}><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={status || ""}><option value="">All statuses</option>{allowed.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><button className="btn btn-secondary" style={{ alignSelf: "end" }}>Filter</button></form>
    <div className="table-wrap"><table className="table"><thead><tr><th>Job #</th><th>Customer</th><th>Vehicle</th><th>Technician</th><th>Status</th><th>Opened</th></tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td><Link className="text-link" href={`/jobs/${job.id}`}>#{String(job.number).padStart(5,"0")}</Link></td><td>{job.customer.name}<br/><small>{job.customer.phone}</small></td><td>{job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}<br/><small>{job.vehicle.plate || job.vehicle.vin || "—"}</small></td><td>{job.technician?.name || "Unassigned"}</td><td><span className={`pill ${job.status.toLowerCase()}`}>{job.status.replaceAll("_", " ").toLowerCase()}</span></td><td>{date(job.createdAt)}</td></tr>)}</tbody></table>{!jobs.length && <div className="empty">No matching jobs found.</div>}</div></section>
  </main>;
}
