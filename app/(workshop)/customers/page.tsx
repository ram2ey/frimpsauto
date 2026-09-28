import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { Pagination } from "@/components/pagination";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE_SIZE = 25;

export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireRole([Role.SUPERVISOR, Role.FINANCE]);
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const trimmed = (q || "").trim();

  // Support numeric job search (e.g. searching "12" or "#12" finds the customer who owns that job order)
  const jobNum = parseInt(trimmed.replace(/^#/, ""), 10);
  const hasJobNum = !isNaN(jobNum) && jobNum > 0;

  const where = trimmed
    ? {
        OR: [
          { name: { contains: trimmed, mode: "insensitive" as const } },
          { phone: { contains: trimmed, mode: "insensitive" as const } },
          { email: { contains: trimmed, mode: "insensitive" as const } },
          {
            vehicles: {
              some: {
                OR: [
                  { plate: { contains: trimmed, mode: "insensitive" as const } },
                  { vin: { contains: trimmed, mode: "insensitive" as const } },
                  { customModel: { contains: trimmed, mode: "insensitive" as const } },
                  { model: { name: { contains: trimmed, mode: "insensitive" as const } } },
                ],
              },
            },
          },
          ...(hasJobNum
            ? [
                {
                  jobs: {
                    some: {
                      number: jobNum,
                    },
                  },
                },
              ]
            : []),
        ],
      }
    : {};

  const [totalCustomers, customers] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      include: {
        vehicles: { include: { model: true } },
        _count: { select: { jobs: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(totalCustomers / PAGE_SIZE) || 1;
  const isFiltered = Boolean(trimmed);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Customers & vehicles</h1>
          <p className="subtitle">Client directory, vehicle records, and history</p>
        </div>
        {(user.role === Role.SUPERVISOR || user.role === Role.ADMIN) && (
          <Link className="btn btn-primary" href="/jobs/new">
            <Plus size={17} /> New job intake
          </Link>
        )}
      </div>

      <section className="card">
        <form className="row wrap mb" action="/customers" method="GET">
          <div style={{ width: 360, flex: "1 1 260px" }}>
            <label htmlFor="customer-q">Search customer name, phone, VIN, plate or job #</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="customer-q"
                name="q"
                defaultValue={trimmed}
                placeholder="Search by name, 024..., GE-8492, W205, or #00012..."
                style={{ paddingLeft: "36px" }}
              />
              <Search
                size={16}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "12px",
                  color: "var(--muted)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
          <div className="row" style={{ alignSelf: "end", gap: 8 }}>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {isFiltered && (
              <Link href="/customers" className="btn btn-secondary" title="Clear search">
                <X size={15} /> Clear
              </Link>
            )}
          </div>
        </form>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Vehicles</th>
                <th>Jobs</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link className="text-link" href={`/customers/${customer.id}`}>
                      {customer.name}
                    </Link>
                  </td>
                  <td>
                    {customer.phone}
                    <br />
                    <small>{customer.email || "—"}</small>
                  </td>
                  <td>
                    {customer.vehicles.length ? (
                      customer.vehicles.map((vehicle) => (
                        <div key={vehicle.id}>
                          {vehicle.year} {vehicle.model?.name || vehicle.customModel}{" "}
                          <small>{vehicle.plate || vehicle.vin || ""}</small>
                        </div>
                      ))
                    ) : (
                      <small className="muted">No vehicle registered</small>
                    )}
                  </td>
                  <td>{customer._count.jobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!customers.length && (
            <div className="empty">
              {isFiltered ? `No matching customers found for "${trimmed}".` : "No customers registered yet."}
            </div>
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCustomers}
          pageSize={PAGE_SIZE}
          baseUrl="/customers"
          searchParams={{ q: trimmed }}
        />
      </section>
    </main>
  );
}
