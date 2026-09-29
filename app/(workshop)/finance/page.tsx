import Link from "next/link";
import { Location, Role } from "@/generated/prisma/client";
import { decidePartRequest, issuePart } from "@/app/inventory-actions";
import { ensureInvoice } from "@/app/billing-actions";
import { CounterSaleModal } from "@/components/counter-sale-modal";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

export default async function Finance() {
  await requireRole([Role.FINANCE]);
  const [requests, invoices, uninvoicedJobs, directSales, parts] = await Promise.all([
    db.partRequest.findMany({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
      include: { part: true, job: { include: { customer: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.invoice.findMany({
      include: { job: { include: { customer: true } }, items: true, payments: true },
      orderBy: { createdAt: "desc" },
    }),
    db.job.findMany({
      where: { status: "COMPLETED", invoice: null },
      include: { customer: true },
      orderBy: { closedAt: "desc" },
    }),
    db.directSale.findMany({
      where: { location: Location.WORKSHOP },
      include: { seller: true, items: { include: { part: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.part.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const due = invoices
    .filter((invoice) => invoice.status !== "DRAFT")
    .reduce(
      (sum, invoice) =>
        sum +
        invoice.items.reduce((s, item) => s + item.quantity * item.unitCents, 0) -
        invoice.payments.reduce((s, payment) => s + payment.amountCents, 0),
      0
    );

  const received = invoices.reduce(
    (sum, invoice) => sum + invoice.payments.reduce((s, payment) => s + payment.amountCents, 0),
    0
  );

  const directSalesTotal = directSales.reduce((sum, s) => sum + s.totalCents, 0);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Finance & Invoicing</h1>
          <p className="subtitle">Job orders, parts requisitions, customer billing & workshop counter sales</p>
        </div>
        <CounterSaleModal parts={parts} location="WORKSHOP" buttonLabel="+ Workshop counter sale" />
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
          <CounterSaleModal parts={parts} location="WORKSHOP" buttonLabel="+ New counter sale" />
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
      <section className="card">
        <div className="section-title">
          <h2>Job Invoices</h2>
        </div>
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
          {!invoices.length && <div className="empty">Invoices will appear when parts or labor are added.</div>}
        </div>
      </section>
    </main>
  );
}
