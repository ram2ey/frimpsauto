import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { addProformaLine, recordDeposit, setProformaStatus, updateProformaDetails } from "@/app/proforma-actions";
import { ProformaLineItems } from "@/components/proforma-line-items";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";
import { proformaReference } from "@/lib/invoice-pdf";
import { proformaFilename, proformaShareText } from "@/lib/share-text";
import { SharePdfButton } from "@/components/share-pdf-button";

const STATUS_ACTIONS = [
  { status: "SENT", label: "Mark as sent", className: "btn btn-primary" },
  { status: "ACCEPTED", label: "Customer accepted", className: "btn btn-teal" },
  { status: "DECLINED", label: "Customer declined", className: "btn btn-danger" },
] as const;

export default async function ProformaDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.FINANCE]);
  const { id } = await params;
  const [proforma, parts, business] = await Promise.all([
    db.proforma.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            customer: true,
            vehicle: { include: { model: true } },
            invoice: { include: { payments: { orderBy: { paidAt: "desc" } } } },
          },
        },
        items: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.part.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.businessProfile.findUnique({ where: { id: "primary" }, select: { name: true } }),
  ]);
  if (!proforma) notFound();

  const { job } = proforma;
  const reference = proformaReference(proforma.number, proforma.revision);
  const total = proforma.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
  const deposits = job.invoice?.payments.filter(payment => payment.isDeposit) ?? [];
  const paidOnInvoice = job.invoice?.payments.reduce((sum, payment) => sum + payment.amountCents, 0) ?? 0;
  const deposited = deposits.reduce((sum, payment) => sum + payment.amountCents, 0);
  const invoiceIssued = Boolean(job.invoice && job.invoice.status !== "DRAFT");
  const depositRoom = total - paidOnInvoice;
  const sent = proforma.status !== "DRAFT";
  const vehicle = `${job.vehicle.year} ${job.vehicle.model?.name || job.vehicle.customModel || ""}`.trim();

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow">Finance / Proformas</div>
          <h1>Proforma {reference}</h1>
          <p className="subtitle">
            <Link className="text-link" href={`/jobs/${job.id}`}>Job #{String(job.number).padStart(5, "0")}</Link> · {job.customer.name} · {vehicle}
          </p>
        </div>
        <div className="row wrap">
          <span className={`pill ${proforma.status.toLowerCase()}`}>{proforma.status.toLowerCase()}</span>
          <a className="btn btn-primary" href={`/api/proformas/${id}/download`} download>Download PDF</a>
          <SharePdfButton
            url={`/api/proformas/${id}/download`}
            filename={proformaFilename(proforma.number, proforma.revision)}
            title={`Proforma ${reference}`}
            text={proformaShareText(business?.name, reference, total, proforma.validUntil)}
          />
          {job.invoice && <Link className="btn btn-secondary" href={`/finance/invoices/${job.invoice.id}`}>Invoice</Link>}
          <Link className="btn btn-secondary" href="/finance">Finance</Link>
        </div>
      </div>

      {sent && (
        <div className="notice">
          This proforma was {proforma.status === "SENT" ? "sent to" : proforma.status === "ACCEPTED" ? "accepted by" : "declined by"} the customer.
          Changing a line, the validity date or the notes starts revision {proforma.revision + 1}, which needs to be sent again.
        </div>
      )}
      {!sent && proforma.revision > 1 && (
        <div className="notice">Revision {proforma.revision}: download the updated PDF, send it to the customer, then mark it as sent.</div>
      )}

      <div className="grid three mb">
        <div className="card stat">
          <div className="label">Estimated total</div>
          <div className="value">{money(total)}</div>
        </div>
        <div className="card stat">
          <div className="label">Deposits received</div>
          <div className="value">{money(deposited)}</div>
        </div>
        <div className="card stat">
          <div className="label">Valid until</div>
          <div className="value">{date(proforma.validUntil)}</div>
        </div>
      </div>

      <section className="card mb">
        <div className="section-title">
          <h2>Quoted lines</h2>
          <small>{job.customer.phone}</small>
        </div>
        <ProformaLineItems items={proforma.items} canEdit reopensRevision={sent} />
      </section>

      <div className="grid two mb">
        <section className="card">
          <h2>Add part</h2>
          <form action={addProformaLine.bind(null, id)} className="stack">
            <input type="hidden" name="type" value="PART" />
            <div>
              <label htmlFor="partId">Part</label>
              <select id="partId" name="partId" required defaultValue="">
                <option value="" disabled>Select part</option>
                {parts.map(part => (
                  <option key={part.id} value={part.id}>{part.name} · {part.sku} · {money(part.priceCents)}</option>
                ))}
              </select>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="part-quantity">Quantity</label>
                <input id="part-quantity" name="quantity" type="number" min="1" step="1" defaultValue="1" required />
              </div>
              <div>
                <label htmlFor="part-price">Unit price (blank = catalogue)</label>
                <input id="part-price" name="price" type="number" min="0" step="0.01" />
              </div>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.78rem" }}>Quoting a part does not take it out of stock.</p>
            <SubmitButton pendingLabel="Adding part..." style={{ alignSelf: "start" }}>Add part</SubmitButton>
          </form>
        </section>

        <section className="card">
          <h2>Add labor or item</h2>
          <form action={addProformaLine.bind(null, id)} className="stack">
            <div>
              <label htmlFor="type">Type</label>
              <select id="type" name="type" defaultValue="LABOR">
                <option value="LABOR">Labor / service</option>
                <option value="ITEM">Item (e.g. part bought outside)</option>
              </select>
            </div>
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
            <SubmitButton pendingLabel="Adding charge..." style={{ alignSelf: "start" }}>Add charge</SubmitButton>
          </form>
        </section>
      </div>

      <div className="grid two mb">
        <section className="card">
          <h2>Customer response</h2>
          <dl className="detail-list">
            <dt>Status</dt><dd>{proforma.status.toLowerCase()}</dd>
            <dt>Sent</dt><dd>{date(proforma.sentAt)}</dd>
            <dt>Decided</dt><dd>{date(proforma.decidedAt)}</dd>
          </dl>
          <div className="row wrap mt">
            {STATUS_ACTIONS.filter(action => action.status !== proforma.status).map(action => (
              <form key={action.status} action={setProformaStatus.bind(null, id)}>
                <input type="hidden" name="status" value={action.status} />
                <SubmitButton className={action.className} disabled={!proforma.items.length} pendingLabel="Saving...">{action.label}</SubmitButton>
              </form>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Details on the PDF</h2>
          <form action={updateProformaDetails.bind(null, id)} className="stack">
            <div>
              <label htmlFor="validUntil">Valid until</label>
              <input id="validUntil" name="validUntil" type="date" defaultValue={proforma.validUntil?.toISOString().slice(0, 10) ?? ""} />
            </div>
            <div>
              <label htmlFor="notes">Notes for the customer</label>
              <textarea id="notes" name="notes" maxLength={1000} defaultValue={proforma.notes ?? ""} placeholder="e.g. Prices for imported parts may change. Work starts once a 50% deposit is received." />
            </div>
            <SubmitButton className="btn btn-secondary" pendingLabel="Saving..." style={{ alignSelf: "start" }}>Save details</SubmitButton>
          </form>
        </section>
      </div>

      <div className="grid two">
        <section className="card">
          <h2>Deposits</h2>
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
                {deposits.map(payment => (
                  <tr key={payment.id}>
                    <td>{date(payment.paidAt)}</td>
                    <td>{payment.method}</td>
                    <td>{payment.reference || "—"}</td>
                    <td>{money(payment.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!deposits.length && <div className="empty">No deposit taken.</div>}
          </div>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: "0.8rem" }}>
            Deposits are recorded on the job&apos;s invoice and come off the balance when it is issued.
          </p>
        </section>

        <section className="card">
          <h2>Record deposit</h2>
          {invoiceIssued ? (
            <p className="muted">The invoice has been issued. Record further payments on the invoice.</p>
          ) : depositRoom <= 0 ? (
            <p className="muted">{total ? "Deposits already cover the proforma total." : "Add lines before taking a deposit."}</p>
          ) : (
            <form action={recordDeposit.bind(null, id)} className="stack">
              <div>
                <label htmlFor="amount">Amount</label>
                <input id="amount" name="amount" type="number" min="0.01" max={(depositRoom / 100).toFixed(2)} step="0.01" required />
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
              <SubmitButton pendingLabel="Recording deposit..." style={{ alignSelf: "start" }}>Record deposit</SubmitButton>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
