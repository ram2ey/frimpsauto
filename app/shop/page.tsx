import Link from "next/link";
import { Store } from "lucide-react";
import { Location, Role } from "@/generated/prisma/client";
import { CounterSaleModal } from "@/components/counter-sale-modal";
import { StockTransferModal } from "@/components/stock-transfer-modal";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

export default async function ShopPOSPage() {
  await requireRole([Role.SHOP_STAFF, Role.FINANCE]);

  const [parts, recentSales] = await Promise.all([
    db.part.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    db.directSale.findMany({
      where: { location: Location.RETAIL_SHOP },
      include: {
        seller: true,
        items: { include: { part: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todaySales = recentSales.filter((s) => new Date(s.createdAt) >= startOfDay);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalCents, 0);
  const todayItemsSold = todaySales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );

  const totalShelfStock = parts.reduce((sum, p) => sum + p.shopStockQty, 0);
  const lowShelfStockCount = parts.filter((p) => p.shopStockQty <= p.shopReorderLevel).length;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ color: "#7c3aed" }}>
            Retail Parts Branch
          </div>
          <h1>Point-of-Sale Register</h1>
          <p className="subtitle">
            Walk-in parts sales counter, instant stock decrement & point-of-sale receipt issuance.
          </p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <StockTransferModal
            parts={parts}
            defaultFrom="WORKSHOP"
            buttonLabel="Pull from Workshop"
            className="btn btn-secondary"
          />
          <CounterSaleModal
            parts={parts}
            location="RETAIL_SHOP"
            buttonLabel="Open POS Register"
            className="btn btn-primary"
          />
        </div>
      </div>

      {/* POS Metrics */}
      <div className="grid four mb">
        <div className="card stat">
          <div className="label">Today&apos;s Retail Sales</div>
          <div className="value" style={{ color: "#166534" }}>
            {money(todayRevenue)}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Today&apos;s Transactions</div>
          <div className="value">
            {todaySales.length}
            <small className="muted" style={{ display: "block", fontSize: "0.72rem", fontWeight: 400 }}>
              {todayItemsSold} item{todayItemsSold === 1 ? "" : "s"} sold
            </small>
          </div>
        </div>
        <div className="card stat">
          <div className="label">Units on Retail Shelves</div>
          <div className="value" style={{ color: "var(--blue)" }}>
            {totalShelfStock}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Low Shelf Stock Alerts</div>
          <div className="value" style={{ color: lowShelfStockCount > 0 ? "#b45309" : undefined }}>
            {lowShelfStockCount}
          </div>
        </div>
      </div>

      {/* Quick Launch POS Banner */}
      <section
        className="card mb"
        style={{
          background: "linear-gradient(135deg, #fbf7ff 0%, #f4edff 100%)",
          border: "1px solid #e9d5ff",
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b21a8" }}>
              <Store size={22} />
              <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#4c1d95" }}>Ready for Checkout</h2>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#6b21a8", lineHeight: 1.45 }}>
              Select parts from the catalog, input customer details, apply custom pricing if needed, and issue a printable receipt.
            </p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <StockTransferModal
              parts={parts}
              defaultFrom="WORKSHOP"
              buttonLabel="Request Bay Transfer"
              className="btn btn-secondary"
            />
            <CounterSaleModal
              parts={parts}
              location="RETAIL_SHOP"
              buttonLabel="Start Counter Sale"
              className="btn btn-primary"
            />
          </div>
        </div>
      </section>

      {/* Recent Counter Sales */}
      <section className="card">
        <div className="section-title">
          <div>
            <h2>Recent Retail Sales</h2>
            <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
              Latest point-of-sale transactions completed at the retail shop
            </p>
          </div>
          <Link href="/shop/sales" className="text-link" style={{ fontSize: "0.82rem" }}>
            View all sales →
          </Link>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Receipt</th>
                <th scope="col">Customer</th>
                <th scope="col">Date & Time</th>
                <th scope="col">Items</th>
                <th scope="col">Payment</th>
                <th scope="col" className="number">Total</th>
                <th scope="col">Cashier</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => {
                const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <tr key={sale.id}>
                    <td>
                      <strong>REC-{String(sale.number).padStart(5, "0")}</strong>
                    </td>
                    <td>
                      <div>{sale.customerName}</div>
                      {sale.customerPhone && (
                        <small className="muted">{sale.customerPhone}</small>
                      )}
                    </td>
                    <td>{date(sale.createdAt)}</td>
                    <td>
                      <span
                        title={sale.items.map((i) => `${i.quantity}x ${i.part.name}`).join(", ")}
                        style={{ cursor: "default" }}
                      >
                        {totalItems} unit{totalItems === 1 ? "" : "s"} ({sale.items.length} SKU{sale.items.length === 1 ? "" : "s"})
                      </span>
                    </td>
                    <td>
                      <span
                        className="pill"
                        style={{ background: "#f8fafc", borderColor: "#e2e8f0", fontSize: "0.72rem" }}
                      >
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="number" style={{ fontWeight: 700, color: "var(--blue)" }}>
                      {money(sale.totalCents)}
                    </td>
                    <td>{sale.seller.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!recentSales.length && (
            <div className="empty">No sales recorded yet. Click &quot;Start Counter Sale&quot; to begin.</div>
          )}
        </div>
      </section>
    </main>
  );
}
