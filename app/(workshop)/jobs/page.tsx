import Link from "next/link";
import { Plus } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { LiveSearchForm } from "@/components/live-search-form";
import { Pagination } from "@/components/pagination";
import { VehicleAvatar } from "@/components/vehicle-avatar";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";

const PAGE_SIZE = 25;

export default async function Jobs({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { status, q: rawQ, page: pageParam } = await searchParams;
  const q = (rawQ || "").trim();
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const allowed = ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED"];
  // "12", "#12" or "00012" also finds job order number 12.
  const jobNum = /^#?\d+$/.test(q) ? parseInt(q.replace(/^#/, ""), 10) : NaN;

  const where = {
    ...(user.role === Role.TECHNICIAN ? { technicianId: user.id } : {}),
    ...(status && allowed.includes(status)
      ? { status: status as "OPEN" | "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED" }
      : {}),
    ...(q
      ? {
          OR: [
            { customer: { name: { contains: q, mode: "insensitive" as const } } },
            { customer: { phone: { contains: q, mode: "insensitive" as const } } },
            { vehicle: { plate: { contains: q, mode: "insensitive" as const } } },
            { vehicle: { vin: { contains: q, mode: "insensitive" as const } } },
            ...(Number.isSafeInteger(jobNum) && jobNum > 0 && jobNum <= 2147483647 ? [{ number: jobNum }] : []),
          ],
        }
      : {}),
  };

  const [totalJobs, jobs] = await Promise.all([
    db.job.count({ where }),
    db.job.findMany({
      where,
      include: { customer: true, vehicle: { include: { model: true } }, technician: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(totalJobs / PAGE_SIZE) || 1;
  const isFiltered = Boolean(q) || Boolean(status);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Job orders</h1>
          {user.role === Role.TECHNICIAN && <p className="subtitle">Assigned to you</p>}
        </div>
        {(user.role === Role.ADMIN || user.role === Role.SUPERVISOR) && (
          <Link href="/jobs/new" className="btn btn-primary">
            <Plus size={17} /> New job order
          </Link>
        )}
      </div>

      <section className="card">
        <LiveSearchForm className="row wrap mb">
          <div style={{ width: 300, flex: "0 1 300px" }}>
            <label htmlFor="q">Search customer, phone, VIN, plate or job #</label>
            <input id="q" name="q" defaultValue={q || ""} placeholder="Search jobs..." autoComplete="off" />
          </div>
          <div style={{ width: 180 }}>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={status || ""}>
              <option value="">All statuses</option>
              {allowed.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </LiveSearchForm>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Job #</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Technician</th>
                <th>Status</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link className="text-link" href={`/jobs/${job.id}`}>
                      #{String(job.number).padStart(5, "0")}
                    </Link>
                  </td>
                  <td>
                    {job.customer.name}
                    <br />
                    <small>{job.customer.phone}</small>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <VehicleAvatar vehicle={job.vehicle} size={36} />
                      <div>
                        <span>{job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}</span>
                        <br />
                        <small className="muted">{job.vehicle.plate || job.vehicle.vin || "—"}</small>
                      </div>
                    </div>
                  </td>
                  <td>{job.technician?.name || "Unassigned"}</td>
                  <td>
                    <span className={`pill ${job.status.toLowerCase()}`}>
                      {job.status.replaceAll("_", " ").toLowerCase()}
                    </span>
                  </td>
                  <td>{date(job.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!jobs.length && (
            <div className="empty">
              {isFiltered ? "No matching jobs found." : "No jobs recorded yet."}
            </div>
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalJobs}
          pageSize={PAGE_SIZE}
          baseUrl="/jobs"
          searchParams={{ q, status }}
        />
      </section>
    </main>
  );
}
