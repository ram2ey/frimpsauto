import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { addLabor, issueInvoice, recordPayment, removeLabor } from "@/app/billing-actions";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.FINANCE]);
  const { id } = await params;
  const [invoice, business] = await Promise.all([
    db.invoice.findUnique({
      where: { id },
      include: {
        job: { include: { customer: true, vehicle: { include: { model: true } } } },
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "desc" } },
      },
    }),
    db.businessProfile.findUnique({ where: { id: "primary" } }),
  ]);
  if (!invoice) notFound();

  const total = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const balance = total - paid;

  return (
    <main className="content">
      {/* Printable Business Letterhead */}
      <div className="print-only print-doc-header">
        <div>
          <h2>{business?.name || "FRIMPS AUTO"}</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#4b5563" }}>
            Mercedes-Benz Specialist Workshop
          </p>
          {business?.address && (
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
              {business.address}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#4b5563" }}>
          {business?.phone && <p style={{ margin: 0 }}>Tel: {business.phone}</p>}
          {business?.email && <p style={{ margin: "2px 0 0" }}>{business.email}</p>}
          <p style={{ margin: "4px 0 0", fontWeight: 600, color: "#111827" }}>
            Date: {date(invoice.issuedAt || invoice.createdAt)}
          </p>
        </div>
      </div>

      {/* Screen & Print Document Header */}
      <div className="page-head">
        <div>
          <h1>Invoice INV-{String(invoice.number).padStart(5, "0")}</h1>
          <p className="subtitle">
            Job #{String(invoice.job.number).padStart(5, "0")} · {invoice.job.customer.name}
          </p>
        </div>
        <div className="row wrap">
          <span className={`pill ${invoice.status.toLowerCase()}`}>{invoice.status.toLowerCase()}</span>
          <PrintButton label="Print" />
          <a className="btn btn-primary" href={`/api/invoices/${id}/download`} download>
            Download PDF
          </a>
          <Link className="btn btn-secondary" href="/finance">
            Finance
          </Link>
        </div>
      </div>

      {/* Customer & Vehicle Summary Box for Handover */}
      <div className="print-only card mb" style={{ fontSize: "8.5pt" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div>
            <strong style={{ color: "#374151", display: "block", marginBottom: 2 }}>Bill To:</strong>
            <div style={{ fontWeight: 600, color: "#111827" }}>{invoice.job.customer.name}</div>
            <div style={{ color: "#4b5563" }}>{invoice.job.customer.phone}</div>
            {invoice.job.customer.email && <div style={{ color: "#4b5563" }}>{invoice.job.customer.email}</div>}
          </div>
          <div>
            <strong style={{ color: "#374151", display: "block", marginBottom: 2 }}>Vehicle Specifications:</strong>
            <div style={{ fontWeight: 600, color: "#111827" }}>
              Mercedes-Benz · {invoice.job.vehicle.year} {invoice.job.vehicle.model?.name || invoice.job.vehicle.customModel}
            </div>
            <div style={{ color: "#4b5563" }}>
              Plate: {invoice.job.vehicle.plate || "—"} · VIN: {invoice.job.vehicle.vin || "—"}
            </div>
            {invoice.job.mileage && (
              <div style={{ color: "#4b5563" }}>Odometer: {invoice.job.mileage.toLocaleString()} km</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid three mb">
        <div className="card stat">
          <div className="label">Invoice total</div>
          <div className="value">{money(total)}</div>
        </div>
        <div className="card stat">
          <div className="label">Payments</div>
          <div className="value">{money(paid)}</div>
        </div>
        <div className="card stat">
          <div className="label">Balance due</div>
          <div className="value">{money(balance)}</div>
        </div>
      </div>

      <section className="card mb">
        <div className="section-title">
          <h2>Line items</h2>
          <small>
            {invoice.job.vehicle.year} {invoice.job.vehicle.model?.name || invoice.job.vehicle.customModel}
          </small>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Description</th>
                <th scope="col">Qty</th>
                <th scope="col">Unit</th>
                <th scope="col">Total</th>
                <th scope="col" className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="pill">{item.type.toLowerCase()}</span>
                  </td>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitCents)}</td>
                  <td>{money(item.quantity * item.unitCents)}</td>
                  <td className="no-print">
                    {invoice.status === "DRAFT" && item.type === "LABOR" && (
                      <form action={removeLabor.bind(null, item.id)}>
                        <button className="btn btn-danger btn-small">Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoice.items.length && (
            <div className="empty">Add labor or issue a requested part to create invoice lines.</div>
          )}
        </div>
      </section>

      {invoice.status === "DRAFT" && (
        <div className="grid two mb no-print">
          <section className="card">
            <h2>Add labor or service</h2>
            <form action={addLabor.bind(null, id)} className="stack">
              <div>
                <label htmlFor="description">Description</label>
                <input id="description" name="description" required maxLength={250} />
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="quantity">Quantity</label>
                  <input id="quantity" name="quantity" type="number" min="1" step="1" defaultValue="1" required />
                </div>
                <div>
                  <label htmlFor="price">Unit price</label>
                  <input id="price" name="price" type="number" min="0" step="0.01" required />
                </div>
              </div>
              <button className="btn btn-primary" style={{ alignSelf: "start" }}>
                Add charge
              </button>
            </form>
          </section>
          <section className="card">
            <h2>Issue invoice</h2>
            <dl className="detail-list">
              <dt>Job status</dt>
              <dd>{invoice.job.status.replaceAll("_", " ")}</dd>
              <dt>Issued</dt>
              <dd>{date(invoice.issuedAt)}</dd>
            </dl>
            <form action={issueInvoice.bind(null, id)} className="mt">
              <button
                className="btn btn-teal"
                disabled={invoice.job.status !== "COMPLETED" || !invoice.items.length}
              >
                Issue invoice
              </button>
            </form>
          </section>
        </div>
      )}

      <div className="grid two">
        <section className="card">
          <h2>Payments</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Method</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{date(payment.paidAt)}</td>
                    <td>{payment.method}</td>
                    <td>{payment.reference || "—"}</td>
                    <td>{money(payment.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!invoice.payments.length && <div className="empty">No payments recorded.</div>}
          </div>
        </section>

        {invoice.status !== "DRAFT" && balance > 0 && (
          <section className="card no-print">
            <h2>Record payment</h2>
            <form action={recordPayment.bind(null, id)} className="stack">
              <div>
                <label htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  max={(balance / 100).toFixed(2)}
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="method">Method</label>
                <select id="method" name="method" required>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank transfer">Bank transfer</option>
                  <option value="Mobile money">Mobile money</option>
                </select>
              </div>
              <div>
                <label htmlFor="reference">Reference (optional)</label>
                <input id="reference" name="reference" maxLength={100} />
              </div>
              <button className="btn btn-primary" style={{ alignSelf: "start" }}>
                Record payment
              </button>
            </form>
          </section>
        )}
      </div>

      {/* Printable Counter Footer */}
      <footer className="print-only print-doc-footer">
        <p style={{ margin: 0, fontWeight: 500 }}>
          Thank you for choosing Frimps Auto · Mercedes-Benz Specialist Care
        </p>
        <p style={{ margin: "2px 0 0", color: "#9ca3af" }}>
          Official receipt for services rendered. Inquiries: {business?.phone || "+233 20 000 0000"}
        </p>
      </footer>
    </main>
  );
}
