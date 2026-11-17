import { ArrowRight } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { StockTransferModal } from "@/components/stock-transfer-modal";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";

const LEDGER_LIMIT = 200;

export default async function ShopTransfersPage() {
  await requireRole([Role.SHOP_STAFF, Role.FINANCE]);

  const [transfers, totalsByDestination, parts] = await Promise.all([
    db.stockTransfer.findMany({
      include: {
        part: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LEDGER_LIMIT,
    }),
    db.stockTransfer.groupBy({ by: ["toLocation"], _sum: { quantity: true }, _count: { _all: true } }),
    db.part.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const toShopUnits = totalsByDestination.find((t) => t.toLocation === "RETAIL_SHOP")?._sum.quantity ?? 0;
  const totalTransfers = totalsByDestination.reduce((sum, t) => sum + t._count._all, 0);

  const toWorkshopUnits = totalsByDestination.find((t) => t.toLocation === "WORKSHOP")?._sum.quantity ?? 0;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ color: "#7c3aed" }}>
            Inter-Branch Bridge
          </div>
          <h1>Stock Transfers Ledger</h1>
          <p className="subtitle">
            Auditable movement history connecting Workshop Bay stock and Retail Parts Shop shelves.
          </p>
        </div>
        <StockTransferModal
          parts={parts}
          defaultFrom="WORKSHOP"
          buttonLabel="+ New Stock Transfer"
          className="btn btn-primary"
        />
      </div>

      <div className="grid three mb">
        <div className="card stat">
          <div className="label">Total Transfers Executed</div>
          <div className="value">{totalTransfers}</div>
        </div>
        <div className="card stat">
          <div className="label">Units Received into Shop</div>
          <div className="value" style={{ color: "#7c3aed" }}>
            {toShopUnits}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Units Returned to Workshop</div>
          <div className="value" style={{ color: "var(--blue)" }}>
            {toWorkshopUnits}
          </div>
        </div>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Transfer History</h2>
          <span className="pill">{transfers.length < totalTransfers ? `Latest ${transfers.length} of ${totalTransfers}` : `${totalTransfers} records`}</span>
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
                const isToShop = t.toLocation === "RETAIL_SHOP";

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
                          background: isToShop ? "#f3e8ff" : "#eff6ff",
                          color: isToShop ? "#6b21a8" : "#1e40af",
                          borderColor: isToShop ? "#e9d5ff" : "#bfdbfe",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                        }}
                      >
                        {isToShop ? (
                          <>
                            <span>Workshop Bay</span>
                            <ArrowRight size={12} />
                            <span>Retail Shop</span>
                          </>
                        ) : (
                          <>
                            <span>Retail Shop</span>
                            <ArrowRight size={12} />
                            <span>Workshop Bay</span>
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
