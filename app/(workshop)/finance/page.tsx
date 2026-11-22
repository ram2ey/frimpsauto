import Link from "next/link";
import { Search } from "lucide-react";
import { Location, Role } from "@/generated/prisma/client";
import { LiveSearchForm } from "@/components/live-search-form";
import { decidePartRequest, issuePart } from "@/app/inventory-actions";
import { ensureInvoice } from "@/app/billing-actions";
import { ensureProforma } from "@/app/proforma-actions";
import { proformaReference } from "@/lib/invoice-pdf";
import { CounterSaleModal } from "@/components/counter-sale-modal";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";
import { counterSalesTotal, invoiceTotals } from "@/lib/finance-stats";

const INVOICE_LIST_LIMIT = 100;

const INVOICE_STATUSES = ["DRAFT", "ISSUED", "PARTIAL", "PAID"] as const;
type InvoiceStatusFilter = (typeof INVOICE_STATUSES)[number];

export default async function Finance({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireRole([Role.FINANCE]);
  const { q: rawQ, status: rawStatus } = await searchParams;
  const q = (rawQ || "").trim();
  const status = INVOICE_STATUSES.includes(rawStatus as InvoiceStatusFilter) ? (rawStatus as InvoiceStatusFilter) : undefined;
  // "12", "#12", "INV-00012" or "00012" match invoice or job number 12.
  const numberMatch = q.match(/^(?:inv-?|#)?0*(\d{1,9})$/i);
  const searchNumber = numberMatch ? parseInt(numberMatch[1], 10) : null;
  const contains = { contains: q, mode: "insensitive" as const };
  const invoiceWhere = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { job: { customer: { name: contains } } },
            { job: { customer: { phone: contains } } },
            { job: { vehicle: { plate: contains } } },
            { job: { vehicle: { vin: contains } } },
            ...(searchNumber ? [{ number: searchNumber }, { job: { number: searchNumber } }] : []),
          ],
        }
      : {}),
  };
  const isFiltered = Boolean(q || status);

  const [requests, invoices, uninvoicedJobs, directSales, parts, totals, directSalesTotal, openProformas, unquotedJobs] = await Promise.all([
    db.partRequest.findMany({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
      include: { part: true, job: { include: { customer: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.invoice.findMany({
      where: invoiceWhere,
      include: { job: { include: { customer: true } }, items: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: INVOICE_LIST_LIMIT,
    }),
    db.job.findMany({
      where: { status: "COMPLETED", invoice: null },
      include: { customer: true },
      orderBy: { closedAt: "desc" },
    }),
    db.directSale.findMany({
      where: { location: Location.WORKSHOP },
      include: { seller: { select: { name: true } }, items: { include: { part: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.part.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    invoiceTotals(),
    counterSalesTotal(Location.WORKSHOP),
    db.proforma.findMany({
      where: { status: { in: ["DRAFT", "SENT"] } },
      include: { job: { include: { customer: true } }, items: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.job.findMany({
      where: { status: { not: "COMPLETED" }, proforma: null },
      include: { customer: true, vehicle: { include: { model: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const due = totals.outstandingCents;
  const received = totals.receivedCents;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Finance & Invoicing</h1>
          <p className="subtitle">Job orders, parts requisitions, customer billing & workshop counter sales</p>
        </div>
        <CounterSaleModal canSetPrice parts={parts} location="WORKSHOP" buttonLabel="+ Workshop counter sale" />
      </div>

      <div className="grid four mb">
        <div className="card stat">
          <div className="label">Open part requests</div>
          <div className="value">{requests.length}</div>
        </div>
        <div className="card stat">
          <div className="label">Outstanding job balance</div>
          <div className="value">{money(due)}</div>
        </div>
        <div className="card stat">
          <div className="label">Invoice payments received</div>
          <div className="value" style={{ color: "#147e6a" }}>{money(received)}</div>
        </div>
        <div className="card stat">
          <div className="label">Workshop counter sales</div>
          <div className="value" style={{ color: "var(--blue)" }}>{money(directSalesTotal)}</div>
        </div>
      </div>

      <section className="card mb">
        <div className="section-title">
          <h2>Part requests</h2>
          <span className="pill">{requests.length} pending</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Part</th>
                <th scope="col">Requested</th>
                <th scope="col">Bay Stock</th>
                <th scope="col">Price</th>
                <th scope="col">Note</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <Link className="text-link" href={`/jobs/${request.jobId}`}>
                      #{String(request.job.number).padStart(5, "0")}
                    </Link>
                    <br />
                    <small>{request.job.customer.name}</small>
                  </td>
                  <td>
                    {request.part.name}
                    <br />
                    <small className="mono">{request.part.sku}</small>
                  </td>
                  <td>{request.requestedQty}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: request.part.stockQty < request.requestedQty ? "#c53030" : "inherit" }}>
                      {request.part.stockQty}
                    </span>
                  </td>
                  <td>{money(request.part.priceCents)}</td>
                  <td>{request.note || "—"}</td>
                  <td>
                    {request.status === "REQUESTED" ? (
                      <div className="actions">
                        <form action={decidePartRequest.bind(null, request.id)}>
                          <input type="hidden" name="decision" value="APPROVED" />
                          <SubmitButton className="btn btn-teal btn-small" pendingLabel="...">
                            Approve
                          </SubmitButton>
                        </form>
                        <form action={decidePartRequest.bind(null, request.id)}>
                          <input type="hidden" name="decision" value="REJECTED" />
                          <SubmitButton className="btn btn-danger btn-small" pendingLabel="...">
                            Reject
                          </SubmitButton>
                        </form>
                      </div>
                    ) : (
                      <form action={issuePart.bind(null, request.id)} className="inline-form">
                        <div style={{ width: 70 }}>
                          <label htmlFor={`qty-${request.id}`}>Issue qty</label>
                          <input
                            id={`qty-${request.id}`}
                            type="number"
                            name="quantity"
                            min="1"
                            max={request.requestedQty}
                            defaultValue={request.requestedQty}
                            required
                          />
                        </div>
                        <SubmitButton className="btn btn-primary btn-small" pendingLabel="...">
                          Issue
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!requests.length && <div className="empty">No part requests need action.</div>}
        </div>
      </section>

      <section className="card mb" id="proformas">
        <div className="section-title">
          <div>
            <h2>Proformas</h2>
            <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
              Quotes being prepared or waiting for the customer&apos;s answer
            </p>
          </div>
          <span className="pill">{openProformas.length} open</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Proforma</th>
                <th scope="col">Job</th>
                <th scope="col">Customer</th>
                <th scope="col" className="number">Estimate</th>
                <th scope="col">Status</th>
                <th scope="col">Valid until</th>
              </tr>
            </thead>
            <tbody>
              {openProformas.map(proforma => (
                <tr key={proforma.id}>
                  <td>
                    <Link className="text-link" href={`/finance/proformas/${proforma.id}`}>
                      {proformaReference(proforma.number, proforma.revision)}
                    </Link>
                  </td>
                  <td>
                    <Link className="text-link" href={`/jobs/${proforma.jobId}`}>#{String(proforma.job.number).padStart(5, "0")}</Link>
                  </td>
                  <td>{proforma.job.customer.name}</td>
                  <td className="number">{money(proforma.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0))}</td>
                  <td><span className={`pill ${proforma.status.toLowerCase()}`}>{proforma.status.toLowerCase()}</span></td>
                  <td>{date(proforma.validUntil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!openProformas.length && <div className="empty">No proformas waiting. Prepare one for a job below.</div>}
        </div>
        {!!unquotedJobs.length && (
          <>
            <div className="divider" />
            <h3>Open jobs without a proforma</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Vehicle</th>
                    <th scope="col">Opened</th>
                    <th scope="col"></th>
                  </tr>
                </thead>
                <tbody>
                  {unquotedJobs.map(job => (
                    <tr key={job.id}>
                      <td>
                        <Link className="text-link" href={`/jobs/${job.id}`}>#{String(job.number).padStart(5, "0")}</Link>
                      </td>
                      <td>{job.customer.name}</td>
                      <td>{job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}</td>
                      <td>{date(job.createdAt)}</td>
                      <td>
                        <form action={ensureProforma.bind(null, job.id)}>
                          <SubmitButton className="btn btn-secondary btn-small" pendingLabel="...">
                            Prepare proforma
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {!!uninvoicedJobs.length && (
        <section className="card mb">
          <div className="section-title">
            <h2>Completed jobs awaiting invoice</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Job</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Completed</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {uninvoicedJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Link className="text-link" href={`/jobs/${job.id}`}>
                        #{String(job.number).padStart(5, "0")}
                      </Link>
                    </td>
                    <td>{job.customer.name}</td>
                    <td>{date(job.closedAt)}</td>
                    <td>
                      <form action={ensureInvoice.bind(null, job.id)}>
                        <SubmitButton className="btn btn-secondary btn-small" pendingLabel="...">
                          Prepare invoice
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Workshop Direct Counter Sales */}
      <section className="card mb">
        <div className="section-title">
          <div>
            <h2>Workshop Direct Counter Sales</h2>
            <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
              Walk-in parts sales executed directly at the workshop counter
            </p>
          </div>
          <CounterSaleModal canSetPrice parts={parts} location="WORKSHOP" buttonLabel="+ New counter sale" />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Receipt</th>
                <th scope="col">Customer</th>
                <th scope="col">Date</th>
                <th scope="col">Items</th>
                <th scope="col">Payment</th>
                <th scope="col" className="number">Total</th>
                <th scope="col">Staff</th>
              </tr>
            </thead>
            <tbody>
              {directSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <strong>REC-{String(sale.number).padStart(5, "0")}</strong>
                  </td>
                  <td>
                    <div>{sale.customerName}</div>
                    {sale.customerPhone && <small className="muted">{sale.customerPhone}</small>}
                  </td>
                  <td>{date(sale.createdAt)}</td>
                  <td>
                    <span title={sale.items.map((i) => `${i.quantity}x ${i.part.name}`).join(", ")}>
                      {sale.items.reduce((sum, i) => sum + i.quantity, 0)} item{sale.items.length === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td>
                    <span className="pill" style={{ background: "#f8fafc", fontSize: "0.72rem" }}>
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="number" style={{ fontWeight: 700, color: "var(--blue)" }}>
                    {money(sale.totalCents)}
                  </td>
                  <td>{sale.seller.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!directSales.length && (
            <div className="empty">No direct counter sales recorded at the workshop yet.</div>
          )}
        </div>
      </section>

      {/* Job Invoices */}
      <section className="card" id="invoices">
        <div className="section-title">
          <h2>Job Invoices</h2>
        </div>
        <LiveSearchForm className="row wrap mb">
          <div style={{ flex: "1 1 260px", maxWidth: 380 }}>
            <label htmlFor="invoice-q">Search customer, phone, plate, invoice or job #</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input id="invoice-q" name="q" defaultValue={q} placeholder="e.g. Mensah, 024..., GE-8492, INV-00012" autoComplete="off" style={{ paddingLeft: "36px" }} />
              <Search size={16} aria-hidden="true" style={{ position: "absolute", left: "12px", color: "var(--muted)", pointerEvents: "none" }} />
            </div>
          </div>
          <div style={{ width: 170 }}>
            <label htmlFor="invoice-status">Status</label>
            <select id="invoice-status" name="status" defaultValue={status || ""}>
              <option value="">All statuses</option>
              {INVOICE_STATUSES.map(value => <option key={value} value={value}>{value.toLowerCase()}</option>)}
            </select>
          </div>
        </LiveSearchForm>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Job</th>
                <th scope="col">Customer</th>
                <th scope="col" className="number">Total</th>
                <th scope="col" className="number">Balance</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const total = invoice.items.reduce((s, i) => s + i.quantity * i.unitCents, 0);
                const paid = invoice.payments.reduce((s, p) => s + p.amountCents, 0);
                return (
                  <tr key={invoice.id}>
                    <td>
                      <Link className="text-link" href={`/finance/invoices/${invoice.id}`}>
                        INV-{String(invoice.number).padStart(5, "0")}
                      </Link>
                    </td>
                    <td>#{String(invoice.job.number).padStart(5, "0")}</td>
                    <td>{invoice.job.customer.name}</td>
                    <td className="number">{money(total)}</td>
                    <td className="number" style={{ fontWeight: total - paid > 0 ? 600 : "normal" }}>
                      {money(total - paid)}
                    </td>
                    <td>
                      <span className={`pill ${invoice.status.toLowerCase()}`}>{invoice.status.toLowerCase()}</span>
                    </td>
                    <td>{date(invoice.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!invoices.length && <div className="empty">{isFiltered ? "No invoices match this search." : "Invoices will appear when parts or labor are added."}</div>}
          {invoices.length === INVOICE_LIST_LIMIT && <p className="muted" style={{ fontSize: "0.78rem", marginTop: 8 }}>Showing the {INVOICE_LIST_LIMIT} most recent {isFiltered ? "matching " : ""}invoices. Search to find older ones. Totals above include all invoices.</p>}
        </div>
      </section>
    </main>
  );
}
