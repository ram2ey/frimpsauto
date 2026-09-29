import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { adjustStock, updatePart } from "@/app/inventory-actions";
import { StockTransferModal } from "@/components/stock-transfer-modal";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

export default async function PartDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([Role.SUPERVISOR, Role.FINANCE]);
  const { id } = await params;
  const part = await db.part.findUnique({
    where: { id },
    include: {
      stockMoves: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!part) notFound();
  const manage = user.role === Role.FINANCE || user.role === Role.ADMIN;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow">Inventory / {part.sku}</div>
          <h1>{part.name}</h1>
          <p className="subtitle">
            {money(part.priceCents)} per unit · {part.stockQty} in Workshop Bay · {part.shopStockQty} in Retail Shop
          </p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <StockTransferModal
            parts={[part]}
            defaultFrom={part.shopStockQty > 0 && part.stockQty === 0 ? "RETAIL_SHOP" : "WORKSHOP"}
            buttonLabel="Transfer stock"
          />
          <Link className="btn btn-secondary" href="/inventory">
            All parts
          </Link>
        </div>
      </div>

      <div className="grid three mb">
        <div className="card stat">
          <div className="label">Workshop Bay stock</div>
          <div className="value" style={{ color: "var(--blue)" }}>{part.stockQty}</div>
        </div>
        <div className="card stat">
          <div className="label">Retail Shop shelf stock</div>
          <div className="value" style={{ color: "#7c3aed" }}>{part.shopStockQty}</div>
        </div>
        <div className="card stat">
          <div className="label">Total inventory stock</div>
          <div className="value" style={{ fontWeight: 700 }}>{part.stockQty + part.shopStockQty}</div>
        </div>
      </div>

      <div className="grid two mb">
        <section className="card">
          <h2>Part details</h2>
          {manage ? (
            <form action={updatePart.bind(null, id)} className="stack">
              <div>
                <label htmlFor="name">Name</label>
                <input id="name" name="name" defaultValue={part.name} required />
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="price">Price (GHS)</label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={(part.priceCents / 100).toFixed(2)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="reorderLevel">Bay reorder level</label>
                  <input
                    id="reorderLevel"
                    name="reorderLevel"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={part.reorderLevel}
                    required
                  />
                </div>
              </div>
              <label className="row" style={{ alignItems: "center", gap: 8, marginTop: 4 }}>
                <input type="checkbox" name="active" defaultChecked={part.active} style={{ width: "auto" }} />
                <span>Active in catalog</span>
              </label>
              <SubmitButton pendingLabel="Saving part..." style={{ alignSelf: "start" }}>
                Save part
              </SubmitButton>
            </form>
          ) : (
            <dl className="detail-list">
              <dt>SKU</dt>
              <dd>{part.sku}</dd>
              <dt>Unit price</dt>
              <dd>{money(part.priceCents)}</dd>
              <dt>Workshop Bay Stock</dt>
              <dd>{part.stockQty} (Min {part.reorderLevel})</dd>
              <dt>Retail Shop Stock</dt>
              <dd>{part.shopStockQty}</dd>
              <dt>Status</dt>
              <dd>{part.active ? "Active" : "Inactive"}</dd>
            </dl>
          )}
        </section>

        {manage && (
          <section className="card">
            <h2>Stock adjustment</h2>
            <p className="subtitle mb">Record incoming supplier delivery or a stock audit correction.</p>
            <form action={adjustStock.bind(null, id)} className="stack">
              <div>
                <label htmlFor="adj-location">Target location</label>
                <select id="adj-location" name="location" defaultValue="WORKSHOP">
                  <option value="WORKSHOP">Workshop Bay (Current: {part.stockQty})</option>
                  <option value="RETAIL_SHOP">Retail Parts Shop (Current: {part.shopStockQty})</option>
                </select>
              </div>
              <div>
                <label htmlFor="delta">Quantity change</label>
                <input id="delta" name="delta" type="number" step="1" required placeholder="+10 or -2" />
                <p className="hint">Use a positive number to add stock, negative to deduct.</p>
              </div>
              <div>
                <label htmlFor="reason">Reason / Audit note</label>
                <input
                  id="reason"
                  name="reason"
                  required
                  maxLength={300}
                  placeholder="e.g. Supplier delivery PO-4481 or Inventory count correction"
                />
              </div>
              <SubmitButton pendingLabel="Recording..." style={{ alignSelf: "start" }}>
                Record adjustment
              </SubmitButton>
            </form>
          </section>
        )}
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Stock movement audit log</h2>
          <span className="pill">{part.stockMoves.length} records</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Date & Time</th>
                <th scope="col">Location</th>
                <th scope="col">Change</th>
                <th scope="col">Reason</th>
                <th scope="col">Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {part.stockMoves.map((move) => {
                const isShop = move.location === "RETAIL_SHOP";
                return (
                  <tr key={move.id}>
                    <td>{date(move.createdAt)}</td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          background: isShop ? "#f3e8ff" : "#eff6ff",
                          color: isShop ? "#6b21a8" : "#1e40af",
                          borderColor: isShop ? "#e9d5ff" : "#bfdbfe",
                          fontSize: "0.72rem",
                        }}
                      >
                        {isShop ? "Retail Shop" : "Workshop Bay"}
                      </span>
                    </td>
                    <td style={{ color: move.delta < 0 ? "#a93d3d" : "#147e6a", fontWeight: 700 }}>
                      {move.delta > 0 ? "+" : ""}
                      {move.delta}
                    </td>
                    <td>{move.reason}</td>
                    <td>{move.user.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!part.stockMoves.length && <div className="empty">No stock movements recorded yet.</div>}
        </div>
      </section>
    </main>
  );
}
