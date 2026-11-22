import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { PrintButton } from "@/components/print-button";
import { requireRole } from "@/lib/auth";
import { ratePercent } from "@/lib/commission";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

export default async function CommissionPayoutDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole([Role.FINANCE]);
  const { id } = await params;
  const [payout, business] = await Promise.all([
    db.commissionPayout.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, name: true } },
        paidBy: { select: { name: true } },
        commissions: { include: { invoice: { include: { job: { include: { customer: true, vehicle: { include: { model: true } } } } } } }, orderBy: { earnedAt: "asc" } },
      },
    }),
    db.businessProfile.findUnique({ where: { id: "primary" } }),
  ]);
  if (!payout) notFound();
  const reference = `PAY-${String(payout.number).padStart(5, "0")}`;
  const labor = payout.commissions.reduce((sum, commission) => sum + commission.laborCents, 0);

  return (
    <main className="content">
      <div className="print-only print-doc-header">
        <div>
          <h2>{business?.name || "FRIMPS AUTO"}</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#4b5563" }}>Technician commission payout</p>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#4b5563" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{reference}</p>
          <p style={{ margin: "2px 0 0" }}>Date: {date(payout.paidAt)}</p>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">Finance / Commissions</div>
          <h1>Payout {reference}</h1>
          <p className="subtitle">{payout.technician.name} · {date(payout.paidAt)}</p>
        </div>
        <div className="row wrap no-print">
          <PrintButton label="Print" />
          <Link className="btn btn-secondary" href={`/finance/commissions?tech=${payout.technician.id}`}>Back to commissions</Link>
        </div>
      </div>

      <div className="grid three mb">
        <div className="card stat">
          <div className="label">Amount paid</div>
          <div className="value">{money(payout.amountCents)}</div>
        </div>
        <div className="card stat">
          <div className="label">Labour on these jobs</div>
          <div className="value">{money(labor)}</div>
        </div>
        <div className="card stat">
          <div className="label">Jobs</div>
          <div className="value">{payout.commissions.length}</div>
        </div>
      </div>

      <section className="card mb">
        <dl className="detail-list">
          <dt>Technician</dt><dd>{payout.technician.name}</dd>
          <dt>Paid by</dt><dd>{payout.method}{payout.reference ? ` · ${payout.reference}` : ""}</dd>
          <dt>Recorded by</dt><dd>{payout.paidBy.name}</dd>
          {payout.note && <><dt>Note</dt><dd>{payout.note}</dd></>}
        </dl>
      </section>

      <section className="card">
        <div className="section-title"><h2>Jobs in this payout</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Customer / Vehicle</th>
                <th scope="col">Paid in full</th>
                <th scope="col" className="number">Labour</th>
                <th scope="col">Rate</th>
                <th scope="col" className="number">Commission</th>
              </tr>
            </thead>
            <tbody>
              {payout.commissions.map(commission => {
                const { job } = commission.invoice;
                return (
                  <tr key={commission.id}>
                    <td>#{String(job.number).padStart(5, "0")}</td>
                    <td>
                      {job.customer.name}
                      <br />
                      <small className="muted">{job.vehicle.year} {job.vehicle.model?.name || job.vehicle.customModel}{job.vehicle.plate ? ` · ${job.vehicle.plate}` : ""}</small>
                    </td>
                    <td>{date(commission.earnedAt)}</td>
                    <td className="number">{money(commission.laborCents)}</td>
                    <td>{ratePercent(commission.rateBps)}</td>
                    <td className="number" style={{ fontWeight: 600 }}>{money(commission.amountCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="print-only card mt" style={{ marginTop: 24, fontSize: "8pt" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 8 }}>
            <strong>Paid by:</strong>
            <p style={{ margin: "20px 0 0", color: "#6b7280" }}>Signature: _______________________</p>
          </div>
          <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 8 }}>
            <strong>Received by {payout.technician.name}:</strong>
            <p style={{ margin: "20px 0 0", color: "#6b7280" }}>Signature: _______________________</p>
          </div>
        </div>
      </div>
    </main>
  );
}
