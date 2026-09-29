import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { StockTransferModal } from "@/components/stock-transfer-modal";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";

export default async function WorkshopTransfersPage() {
  await requireRole([Role.SUPERVISOR, Role.FINANCE]);

  const [transfers, parts] = await Promise.all([
    db.stockTransfer.findMany({
      include: {
        part: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.part.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const toWorkshopUnits = transfers
    .filter((t) => t.toLocation === "WORKSHOP")
    .reduce((sum, t) => sum + t.quantity, 0);

  const toShopUnits = transfers
    .filter((t) => t.toLocation === "RETAIL_SHOP")
    .reduce((sum, t) => sum + t.quantity, 0);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow">Inventory / Transfers</div>
          <h1>Inter-Branch Stock Transfers</h1>
          <p className="subtitle">
            Transfer ledger between Workshop Bay inventory and Retail Parts Shop shelves.
          </p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <Link href="/inventory" className="btn btn-secondary">
            ← Parts Catalog
          </Link>
          <StockTransferModal
            parts={parts}
            defaultFrom="WORKSHOP"
            buttonLabel="+ New Stock Transfer"
            className="btn btn-primary"
          />
        </div>
      </div>

      <div className="grid three mb">
        <div className="card stat">
          <div className="label">Total Transfers Executed</div>
          <div className="value">{transfers.length}</div>
        </div>
        <div className="card stat">
          <div className="label">Units Received into Workshop Bay</div>
          <div className="value" style={{ color: "var(--blue)" }}>
            {toWorkshopUnits}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Units Transferred to Retail Shop</div>
          <div className="value" style={{ color: "#7c3aed" }}>
            {toShopUnits}
          </div>
        </div>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Transfer History</h2>
          <span className="pill">{transfers.length} records</span>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Transfer #</th>
                <th scope="col">Date & Time</th>
                <th scope="col">Part</th>
                <th scope="col" className="number">Quantity</th>
                <th scope="col">Movement Direction</th>
                <th scope="col">Initiated By</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const isToWorkshop = t.toLocation === "WORKSHOP";

                return (
                  <tr key={t.id}>
                    <td>
                      <strong>TRF-{String(t.number).padStart(4, "0")}</strong>
                    </td>
                    <td>{date(t.createdAt)}</td>
                    <td>
                      <div><strong>{t.part.name}</strong></div>
                      <small className="mono muted">{t.part.sku}</small>
                    </td>
                    <td className="number" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {t.quantity} unit{t.quantity === 1 ? "" : "s"}
                    </td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: isToWorkshop ? "#eff6ff" : "#f3e8ff",
                          color: isToWorkshop ? "#1e40af" : "#6b21a8",
                          borderColor: isToWorkshop ? "#bfdbfe" : "#e9d5ff",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                        }}
                      >
                        {isToWorkshop ? (
                          <>
                            <span>Retail Shop</span>
                            <ArrowRight size={12} />
                            <span>Workshop Bay</span>
                          </>
                        ) : (
                          <>
                            <span>Workshop Bay</span>
                            <ArrowRight size={12} />
                            <span>Retail Shop</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td>{t.user.name}</td>
                    <td>{t.notes || <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!transfers.length && (
            <div className="empty">No stock transfers executed yet. Click &quot;+ New Stock Transfer&quot; to move parts.</div>
          )}
        </div>
      </section>
    </main>
  );
}
