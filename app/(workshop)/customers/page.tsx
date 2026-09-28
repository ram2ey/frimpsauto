import Link from "next/link";
import { Role } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Customers() {
  const user = await requireRole([Role.SUPERVISOR, Role.FINANCE]);
  const customers = await db.customer.findMany({ include: { vehicles: { include: { model: true } }, _count: { select: { jobs: true } } }, orderBy: { createdAt: "desc" } });
  return <main className="content"><div className="page-head"><div><div className="eyebrow">Workshop records</div><h1>Customers & vehicles</h1><p className="subtitle">Customer records are created during job intake.</p></div>{(user.role === Role.SUPERVISOR || user.role === Role.ADMIN) && <Link className="btn btn-primary" href="/jobs/new">New job intake</Link>}</div><section className="card table-wrap"><table className="table"><thead><tr><th>Customer</th><th>Contact</th><th>Mercedes-Benz vehicles</th><th>Jobs</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id}><td><Link className="text-link" href={`/customers/${customer.id}`}>{customer.name}</Link></td><td>{customer.phone}<br/><small>{customer.email || ""}</small></td><td>{customer.vehicles.map(vehicle => <div key={vehicle.id}>{vehicle.year} {vehicle.model?.name || vehicle.customModel} <small>{vehicle.plate || ""}</small></div>)}</td><td>{customer._count.jobs}</td></tr>)}</tbody></table>{!customers.length && <div className="empty">Customers will appear here after the first job intake.</div>}</section></main>;
}
