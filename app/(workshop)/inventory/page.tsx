import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { CreatePartForm } from "@/components/create-part-form";
import { CounterSaleModal } from "@/components/counter-sale-modal";
import { StockTransferModal } from "@/components/stock-transfer-modal";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export default async function Inventory() {
  const user = await requireRole([Role.SUPERVISOR, Role.FINANCE]);
  const manage = user.role === Role.FINANCE || user.role === Role.ADMIN;
  const parts = await db.part.findMany({ orderBy: { name: "asc" } });

  const lowBay = parts.filter((part) => part.active && part.stockQty <= part.reorderLevel).length;
  const totalBayUnits = parts.reduce((sum, part) => sum + part.stockQty, 0);
  const totalShopUnits = parts.reduce((sum, part) => sum + part.shopStockQty, 0);

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <h1>Parts inventory</h1>
          <p className="subtitle">Workshop Bay inventory, stock levels, inter-branch transfers & counter sales</p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <Link href="/inventory/transfers" className="btn btn-secondary btn-small" style={{ minHeight: "36px", padding: "6px 12px" }}>
            Transfers ledger
          </Link>
          <CounterSaleModal canSetPrice={manage} parts={parts} location="WORKSHOP" buttonLabel="Counter sale" />
          <StockTransferModal parts={parts} defaultFrom="WORKSHOP" buttonLabel="Transfer stock" />
        </div>
      </div>

      <div className="grid four mb">
        <div className="card stat">
          <div className="label">Catalog parts</div>
          <div className="value">{parts.length}</div>
        </div>
        <div className="card stat">
          <div className="label">Workshop Bay stock</div>
          <div className="value" style={{ color: "var(--blue)" }}>{totalBayUnits}</div>
        </div>
        <div className="card stat">
          <div className="label">Retail Shop stock</div>
          <div className="value" style={{ color: "#7c3aed" }}>{totalShopUnits}</div>
        </div>
        <div className="card stat">
          <div className="label">Low bay stock alerts</div>
          <div className="value" style={{ color: lowBay > 0 ? "#b45309" : undefined }}>{lowBay}</div>
        </div>
      </div>

      <section className="card mb">
        <div className="section-title">
          <h2>All parts</h2>
          <span className="pill waiting_parts">{lowBay} low bay stock</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col">SKU</th>
                <th scope="col" className="number">Unit price</th>
                <th scope="col" className="number">Workshop Bay</th>
                <th scope="col" className="number">Retail Shop</th>
                <th scope="col" className="number">Total Stock</th>
                <th scope="col">Bay Status</th>
                <th scope="col" className="no-print" style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => {
                const totalStock = part.stockQty + part.shopStockQty;
                const isLowBay = part.stockQty <= part.reorderLevel;
                const isOutOfBay = part.stockQty === 0;

                return (
                  <tr key={part.id}>
                    <td>
                      <Link className="text-link" href={`/inventory/${part.id}`}>
                        <strong>{part.name}</strong>
                      </Link>
                    </td>
                    <td><span className="mono">{part.sku}</span></td>
                    <td className="number">{money(part.priceCents)}</td>
                    <td className="number" style={{ fontWeight: 600 }}>
                      <span style={{ color: isOutOfBay ? "#c53030" : isLowBay ? "#b45309" : "inherit" }}>
                        {part.stockQty}
                      </span>
                      <small className="muted" style={{ display: "block", fontSize: "0.7rem" }}>
                        min {part.reorderLevel}
                      </small>
                    </td>
                    <td className="number" style={{ color: "#7c3aed", fontWeight: 500 }}>
                      {part.shopStockQty}
                    </td>
                    <td className="number" style={{ fontWeight: 700 }}>
                      {totalStock}
                    </td>
                    <td>
                      <span
                        className={`pill ${
                          !part.active
                            ? "rejected"
                            : isOutOfBay
                            ? "rejected"
                            : isLowBay
                            ? "waiting_parts"
                            : "approved"
                        }`}
                      >
                        {!part.active
                          ? "Inactive"
                          : isOutOfBay
                          ? "Out of bay stock"
                          : isLowBay
                          ? "Low stock"
                          : "Available"}
                      </span>
                    </td>
                    <td className="no-print" style={{ textAlign: "right" }}>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                        <StockTransferModal
                          parts={[part]}
                          defaultFrom={part.shopStockQty > 0 && part.stockQty === 0 ? "RETAIL_SHOP" : "WORKSHOP"}
                          buttonLabel="Transfer"
                          className="btn btn-secondary btn-small"
                        />
                        <Link
                          href={`/inventory/${part.id}`}
                          className="btn btn-secondary btn-small"
                          style={{ minHeight: "30px", padding: "4px 8px", fontSize: "0.74rem" }}
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!parts.length && <div className="empty">No parts in the catalog yet.</div>}
        </div>
      </section>

      {manage && (
        <section className="card">
          <div className="section-title">
            <div>
              <h2>Add a part to catalog</h2>
              <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                Create a new SKU with initial stock allocated to Workshop Bay or Retail Parts Shop.
              </p>
            </div>
            <PackagePlus size={19} />
          </div>
          <CreatePartForm location="WORKSHOP" />
        </section>
      )}
    </main>
  );
}
