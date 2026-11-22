import Link from "next/link";
import { Role } from "@/generated/prisma/client";
import { recordCommissionPayout, setCommissionRate } from "@/app/commission-actions";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { ratePercent } from "@/lib/commission";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

const payoutNumber = (number: number) => `PAY-${String(number).padStart(5, "0")}`;

export default async function Commissions({ searchParams }: { searchParams: Promise<{ tech?: string }> }) {
  const user = await requireRole([Role.FINANCE]);
  const isAdmin = user.role === Role.ADMIN;
  const { tech } = await searchParams;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [technicians, owedByTech, paidByTech, earnedThisMonth, paidThisMonth] = await Promise.all([
    db.user.findMany({ where: { role: Role.TECHNICIAN }, select: { id: true, name: true, active: true, commissionBps: true }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.commission.groupBy({ by: ["technicianId"], where: { payoutId: null }, _sum: { amountCents: true } }),
    db.commissionPayout.groupBy({ by: ["technicianId"], _sum: { amountCents: true } }),
    db.commission.aggregate({ where: { earnedAt: { gte: monthStart } }, _sum: { amountCents: true } }),
    db.commissionPayout.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { amountCents: true } }),
  ]);
  const owed = new Map(owedByTech.map(row => [row.technicianId, row._sum.amountCents ?? 0]));
  const paidOut = new Map(paidByTech.map(row => [row.technicianId, row._sum.amountCents ?? 0]));
  const totalOwed = [...owed.values()].reduce((sum, value) => sum + value, 0);

  const selected = technicians.find(technician => technician.id === tech) ?? null;
  const [unpaid, payouts] = selected
    ? await Promise.all([
        db.commission.findMany({
          where: { technicianId: selected.id, payoutId: null },
          include: { invoice: { include: { job: { include: { customer: true } } } } },
          orderBy: { earnedAt: "asc" },
        }),
        db.commissionPayout.findMany({
          where: { technicianId: selected.id },
          include: { paidBy: { select: { name: true } }, _count: { select: { commissions: true } } },
          orderBy: { paidAt: "desc" },
          take: 50,
        }),
      ])
    : [[], []];
  const selectedOwed = unpaid.reduce((sum, commission) => sum + commission.amountCents, 0);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow">Finance</div>
          <h1>Technician commissions</h1>
          <p className="subtitle">Each technician&apos;s share of the labour on jobs that have been paid in full</p>
        </div>
        <Link className="btn btn-secondary" href="/finance">Finance</Link>
      </div>

      <div className="grid three mb">
        <div className="card stat">
          <div className="label">Owed to technicians</div>
          <div className="value">{money(totalOwed)}</div>
        </div>
        <div className="card stat">
          <div className="label">Earned this month</div>
          <div className="value">{money(earnedThisMonth._sum.amountCents ?? 0)}</div>
        </div>
        <div className="card stat">
          <div className="label">Paid out this month</div>
          <div className="value">{money(paidThisMonth._sum.amountCents ?? 0)}</div>
        </div>
      </div>

      <section className="card mb">
        <div className="section-title">
          <div>
            <h2>Technicians</h2>
            <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
              {isAdmin ? "Leave the rate blank for no commission. A new rate applies to invoices paid in full after you save it." : "Only an admin can change rates."}
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Technician</th>
                <th scope="col">Rate of labour</th>
                <th scope="col" className="number">Owed</th>
                <th scope="col" className="number">Paid out (all time)</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {technicians.map(technician => (
                <tr key={technician.id}>
                  <td>
                    <strong>{technician.name}</strong>
                    {!technician.active && <> <span className="pill rejected">disabled</span></>}
                  </td>
                  <td>
                    {isAdmin ? (
                      <form action={setCommissionRate.bind(null, technician.id)} className="inline-form">
                        <div style={{ width: 90 }}>
                          <label className="sr-only" htmlFor={`rate-${technician.id}`}>Rate for {technician.name} (%)</label>
                          <input id={`rate-${technician.id}`} name="rate" inputMode="decimal" placeholder="e.g. 20" defaultValue={technician.commissionBps == null ? "" : String(technician.commissionBps / 100)} />
                        </div>
                        <span className="muted">%</span>
                        <SubmitButton className="btn btn-secondary btn-small" pendingLabel="...">Save</SubmitButton>
                      </form>
                    ) : (
                      ratePercent(technician.commissionBps)
                    )}
                  </td>
                  <td className="number" style={{ fontWeight: (owed.get(technician.id) ?? 0) > 0 ? 600 : undefined }}>{money(owed.get(technician.id) ?? 0)}</td>
                  <td className="number">{money(paidOut.get(technician.id) ?? 0)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn btn-secondary btn-small" href={`/finance/commissions?tech=${technician.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!technicians.length && <div className="empty">No technician accounts yet.</div>}
        </div>
      </section>

      {selected && (
        <>
          <section className="card mb" id="unpaid">
            <div className="section-title">
              <div>
                <h2>Unpaid commissions: {selected.name}</h2>
                <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>Untick any job you are not paying yet.</p>
              </div>
              <span className="pill">{money(selectedOwed)} owed</span>
            </div>
            {unpaid.length ? (
              <form action={recordCommissionPayout.bind(null, selected.id)} className="stack">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: 40 }}><span className="sr-only">Pay</span></th>
                        <th scope="col">Job</th>
                        <th scope="col">Invoice</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Paid in full</th>
                        <th scope="col" className="number">Labour</th>
                        <th scope="col">Rate</th>
                        <th scope="col" className="number">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaid.map(commission => (
                        <tr key={commission.id}>
                          <td>
                            <input type="checkbox" name="commissionId" value={commission.id} defaultChecked aria-label={`Pay job #${String(commission.invoice.job.number).padStart(5, "0")}`} />
                          </td>
                          <td><Link className="text-link" href={`/jobs/${commission.invoice.jobId}`}>#{String(commission.invoice.job.number).padStart(5, "0")}</Link></td>
                          <td><Link className="text-link" href={`/finance/invoices/${commission.invoiceId}`}>INV-{String(commission.invoice.number).padStart(5, "0")}</Link></td>
                          <td>{commission.invoice.job.customer.name}</td>
                          <td>{date(commission.earnedAt)}</td>
                          <td className="number">{money(commission.laborCents)}</td>
                          <td>{ratePercent(commission.rateBps)}</td>
                          <td className="number" style={{ fontWeight: 600 }}>{money(commission.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="form-grid">
                  <div>
                    <label htmlFor="method">Paid by</label>
                    <select id="method" name="method" required defaultValue="Mobile money">
                      <option value="Cash">Cash</option>
                      <option value="Bank transfer">Bank transfer</option>
                      <option value="Mobile money">Mobile money</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="reference">Reference (optional)</label>
                    <input id="reference" name="reference" maxLength={100} />
                  </div>
                  <div className="field-wide">
                    <label htmlFor="note">Note (optional)</label>
                    <input id="note" name="note" maxLength={500} placeholder="e.g. November commission" />
                  </div>
                </div>
                <SubmitButton className="btn btn-teal" pendingLabel="Recording payout..." style={{ alignSelf: "start" }}>Record payout for ticked jobs</SubmitButton>
              </form>
            ) : (
              <div className="empty">Nothing owed to {selected.name}.</div>
            )}
          </section>

          <section className="card">
            <div className="section-title"><h2>Payout history: {selected.name}</h2></div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Payout</th>
                    <th scope="col">Date</th>
                    <th scope="col">Method</th>
                    <th scope="col">Jobs</th>
                    <th scope="col">Paid by</th>
                    <th scope="col" className="number">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(payout => (
                    <tr key={payout.id}>
                      <td><Link className="text-link" href={`/finance/commissions/payouts/${payout.id}`}>{payoutNumber(payout.number)}</Link></td>
                      <td>{date(payout.paidAt)}</td>
                      <td>{payout.method}{payout.reference ? ` · ${payout.reference}` : ""}</td>
                      <td>{payout._count.commissions}</td>
                      <td>{payout.paidBy.name}</td>
                      <td className="number" style={{ fontWeight: 600 }}>{money(payout.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!payouts.length && <div className="empty">No payouts recorded yet.</div>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
