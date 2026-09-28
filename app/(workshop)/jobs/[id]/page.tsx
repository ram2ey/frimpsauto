import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Plus, ArrowUpRight } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { JobInspection } from "@/components/job-inspection";
import { JobTabs } from "@/components/job-tabs";
import { JobCompleteModal } from "@/components/job-complete-modal";
import { PrintButton } from "@/components/print-button";
import { canViewJob } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";
import { assignTechnician, requestPart, updateFindings } from "@/app/job-actions";

export default async function JobDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = (await searchParams) || {};
  const validTabs = ["overview", "checklist", "parts", "diagnostics", "billing"] as const;
  const defaultTab = validTabs.includes(tab as (typeof validTabs)[number]) ? (tab as (typeof validTabs)[number]) : "overview";
  const user = await canViewJob(id);
  const job = await db.job.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: { include: { model: true } },
      technician: true,
      checklist: { orderBy: { sortOrder: "asc" } },
      diagnostics: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true } },
      partRequests: { include: { part: true }, orderBy: { createdAt: "desc" } },
      invoice: { include: { items: true, payments: true } },
    },
  });
  if (!job) notFound();

  const edit = (user.role === Role.SUPERVISOR || user.role === Role.ADMIN) && job.status !== "COMPLETED";
  const [technicians, parts] = await Promise.all([
    edit ? db.user.findMany({ where: { role: Role.TECHNICIAN, active: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    edit ? db.part.findMany({ where: { active: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const total = job.invoice?.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0) || 0;
  const paid = job.invoice?.payments.reduce((sum, payment) => sum + payment.amountCents, 0) || 0;
  const balance = total - paid;

  const checkedCount = job.checklist.filter(item => item.result).length;
  const totalCount = job.checklist.length;

  return (
    <main className="content">
      {/* Printable Workshop Sheet Header */}
      <div className="print-only print-doc-header">
        <div>
          <h2>FRIMPS AUTO</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#4b5563" }}>
            Mercedes-Benz Specialist Workshop · Work Order & Technical Inspection
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#4b5563" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>
            Job Order #{String(job.number).padStart(5, "0")}
          </p>
          <p style={{ margin: "2px 0 0" }}>Date: {date(job.createdAt)}</p>
        </div>
      </div>

      {/* Persistent Page Head */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Workshop / Job orders</div>
          <h1>Job #{String(job.number).padStart(5, "0")}</h1>
          <p className="subtitle">Opened {date(job.createdAt)} · {job.customer.name}</p>
        </div>
        <div className="row wrap">
          <span className={`pill ${job.status.toLowerCase()}`}>{job.status.replaceAll("_", " ").toLowerCase()}</span>
          <PrintButton label="Print" />
          <Link className="btn btn-secondary" href="/jobs">All jobs</Link>
        </div>
      </div>

      {/* Persistent Bay Quick Bar */}
      <div className="job-quick-bar card mb" aria-label="Vehicle and customer summary">
        <div className="job-quick-item">
          <small>Vehicle</small>
          <strong>Mercedes-Benz · {job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}</strong>
        </div>
        <div className="job-quick-item">
          <small>Plate / VIN</small>
          <span>{job.vehicle.plate || "No plate"} {job.vehicle.vin ? `· ${job.vehicle.vin}` : ""}</span>
        </div>
        <div className="job-quick-item">
          <small>Customer</small>
          <span>
            {job.customer.name} · <a href={`tel:${job.customer.phone}`} className="text-link">{job.customer.phone}</a>
          </span>
        </div>
        <div className="job-quick-item">
          <small>Technician</small>
          <span>{job.technician?.name || <em className="muted">Unassigned</em>}</span>
        </div>
      </div>

      {/* Operational Bay Tabs (Option A) */}
      <JobTabs
        defaultTab={defaultTab}
        counts={{
          checklist: totalCount > 0 ? `${checkedCount}/${totalCount}` : undefined,
          parts: job.partRequests.length,
          diagnostics: job.diagnostics.length,
          billing: job.invoice ? money(balance) : undefined,
        }}
        overview={
          <div className="grid two mb">
            <section className="card">
              <div className="section-title"><h2>Customer & vehicle</h2></div>
              <dl className="detail-list">
                <dt>Customer</dt><dd>{job.customer.name}</dd>
                <dt>Phone</dt><dd><a href={`tel:${job.customer.phone}`} className="text-link">{job.customer.phone}</a></dd>
                <dt>Email</dt><dd>{job.customer.email ? <a href={`mailto:${job.customer.email}`} className="text-link">{job.customer.email}</a> : "—"}</dd>
                <dt>Vehicle</dt><dd>{job.vehicle.year} Mercedes-Benz {job.vehicle.model?.name || job.vehicle.customModel}</dd>
                <dt>VIN</dt><dd>{job.vehicle.vin || "—"}</dd>
                <dt>Plate</dt><dd>{job.vehicle.plate || "—"}</dd>
                <dt>Color</dt><dd>{job.vehicle.color || "—"}</dd>
              </dl>
              <div className="mt">
                <Link className="text-link" href={`/customers/${job.customerId}`}>View customer profile & other vehicles <ArrowUpRight size={13} aria-hidden="true" /></Link>
              </div>
            </section>

            <section className="card">
              <div className="section-title"><h2>Job details</h2></div>
              <p className="muted" style={{ fontSize: ".75rem", textTransform: "uppercase", fontWeight: 800 }}>Customer complaint</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{job.complaint}</p>
              <div className="divider" />
              <dl className="detail-list">
                <dt>Technician</dt><dd>{job.technician?.name || "Unassigned"}</dd>
                <dt>Closed</dt><dd>{date(job.closedAt)}</dd>
              </dl>
              {edit && (
                <form action={assignTechnician.bind(null, id)} className="inline-form mt">
                  <div style={{ flex: 1 }}>
                    <label htmlFor="technicianId">Assign technician</label>
                    <select id="technicianId" name="technicianId" defaultValue={job.technicianId || ""}>
                      <option value="">Unassigned</option>
                      {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-secondary">Save</button>
                </form>
              )}
            </section>
          </div>
        }
        checklist={
          <div className="mb">
            <JobInspection jobId={id} mileage={job.mileage} items={job.checklist} edit={edit} />
          </div>
        }
        parts={
          <section className="card mb">
            <div className="section-title">
              <h2>Parts requests</h2>
              <span className="pill">{job.partRequests.length} requests</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>SKU</th>
                    <th>Requested</th>
                    <th>Issued</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {job.partRequests.map(request => (
                    <tr key={request.id}>
                      <td><strong>{request.part.name}</strong></td>
                      <td>{request.part.sku}</td>
                      <td>{request.requestedQty}</td>
                      <td>{request.issuedQty}</td>
                      <td>{money(request.part.priceCents)}</td>
                      <td><span className={`pill ${request.status.toLowerCase()}`}>{request.status.toLowerCase()}</span></td>
                      <td>{request.note || request.decisionNote || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!job.partRequests.length && <div className="empty">No parts requested for this job yet.</div>}
            </div>
            {edit && (
              <>
                <div className="divider" />
                <form action={requestPart.bind(null, id)} className="form-grid">
                  <div className="field">
                    <label htmlFor="partId">Part</label>
                    <select id="partId" name="partId" required defaultValue="">
                      <option value="" disabled>Select part</option>
                      {parts.map(part => (
                        <option value={part.id} key={part.id}>
                          {part.name} · {part.sku} · {money(part.priceCents)} ({part.stockQty} in stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="quantity">Quantity</label>
                    <input id="quantity" name="quantity" type="number" min="1" step="1" defaultValue="1" required />
                  </div>
                  <div className="field field-wide">
                    <label htmlFor="requestNote">Request note</label>
                    <input id="requestNote" name="note" placeholder="Why this part is needed" />
                  </div>
                  <div>
                    <button className="btn btn-primary"><Plus size={16} /> Request part</button>
                  </div>
                </form>
              </>
            )}
          </section>
        }
        diagnostics={
          <div className="grid two mb">
            <section className="card">
              <div className="section-title"><h2>Supervisor findings</h2></div>
              {edit ? (
                <form action={updateFindings.bind(null, id)} className="stack">
                  <div>
                    <label htmlFor="findings">Supervisor findings</label>
                    <textarea id="findings" name="findings" defaultValue={job.findings || ""} placeholder="Record inspection and diagnostic findings" />
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: "start" }}>Save findings</button>
                </form>
              ) : (
                <p style={{ whiteSpace: "pre-wrap" }}>{job.findings || "No findings recorded yet."}</p>
              )}
            </section>

            <section className="card">
              <div className="section-title"><h2>Diagnostic files</h2></div>
              <div className="stack">
                {job.diagnostics.map(file => (
                  <a className="text-link row" href={`/api/diagnostics/${file.id}`} key={file.id}>
                    <FileText size={16} />
                    <span>{file.name}</span>
                    <small>· {date(file.createdAt)}</small>
                  </a>
                ))}
                {!job.diagnostics.length && <span className="muted">No files uploaded yet.</span>}
              </div>
              {edit && (
                <form action={`/api/jobs/${id}/diagnostics`} method="post" encType="multipart/form-data" className="stack mt">
                  <div>
                    <label htmlFor="diagnostic">Upload initial diagnostic (PDF or JPG, max 10 MB)</label>
                    <input id="diagnostic" name="file" type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" required />
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: "start" }}>Upload file</button>
                </form>
              )}
            </section>
          </div>
        }
        billing={
          <section className="card mb">
            <div className="section-title">
              <h2>Invoice summary</h2>
              {job.invoice && (user.role === Role.ADMIN || user.role === Role.FINANCE) && (
                <div className="actions">
                  <Link className="btn btn-secondary btn-small" href={`/finance/invoices/${job.invoice.id}`}>View full invoice</Link>
                  <a className="btn btn-primary btn-small" href={`/api/invoices/${job.invoice.id}/download`} download>Download PDF</a>
                </div>
              )}
            </div>
            {job.invoice ? (
              <>
                <div className="grid three mb">
                  <div className="stat">
                    <div className="label">Total amount</div>
                    <div className="value">{money(total)}</div>
                  </div>
                  <div className="stat">
                    <div className="label">Payments received</div>
                    <div className="value">{money(paid)}</div>
                  </div>
                  <div className="stat">
                    <div className="label">Balance due</div>
                    <div className="value">{money(balance)}</div>
                  </div>
                </div>

                <h3>Invoice line items</h3>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.invoice.items.map(item => (
                        <tr key={item.id}>
                          <td><span className="pill">{item.type.toLowerCase()}</span></td>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{money(item.unitCents)}</td>
                          <td>{money(item.quantity * item.unitCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="muted">Finance will prepare the invoice when parts or labor are added.</p>
            )}
          </section>
        }
      />

      {/* Completion Action */}
      {edit && (
        <JobCompleteModal
          jobId={id}
          jobNumber={job.number}
          vehicleTitle={`Mercedes-Benz · ${job.vehicle.year} ${job.vehicle.model?.name || job.vehicle.customModel || "Vehicle"}`}
          checklistCount={checkedCount}
          totalChecklistCount={totalCount}
          partRequests={job.partRequests}
        />
      )}

      {/* Printable Workshop Sign-off Section */}
      <div className="print-only card mt" style={{ marginTop: 24, fontSize: "8pt" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 8 }}>
            <strong>Assigned Technician:</strong>
            <p style={{ margin: "4px 0 0" }}>{job.technician?.name || "Unassigned"}</p>
            <p style={{ margin: "20px 0 0", color: "#6b7280" }}>Signature: _______________________</p>
          </div>
          <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 8 }}>
            <strong>Workshop Supervisor:</strong>
            <p style={{ margin: "4px 0 0" }}>Quality Inspection Sign-off</p>
            <p style={{ margin: "20px 0 0", color: "#6b7280" }}>Signature: _______________________</p>
          </div>
          <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 8 }}>
            <strong>Customer Handover:</strong>
            <p style={{ margin: "4px 0 0" }}>{job.customer.name}</p>
            <p style={{ margin: "20px 0 0", color: "#6b7280" }}>Signature: _______________________</p>
          </div>
        </div>
      </div>

      {/* Printable Sheet Footer */}
      <footer className="print-only print-doc-footer">
        <p style={{ margin: 0, fontWeight: 500 }}>
          Frimps Auto · Mercedes-Benz Specialist Workshop · Official Job Order Record
        </p>
      </footer>
    </main>
  );
}
