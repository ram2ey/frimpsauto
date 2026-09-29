import { Location, Role } from "@/generated/prisma/client";
import { CounterSaleModal } from "@/components/counter-sale-modal";
import { ReceiptViewerButton } from "@/components/receipt-viewer-button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

export default async function ShopSalesPage() {
  await requireRole([Role.SHOP_STAFF, Role.FINANCE]);

  const [sales, parts] = await Promise.all([
    db.directSale.findMany({
      where: { location: Location.RETAIL_SHOP },
      include: {
        seller: true,
        items: { include: { part: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.part.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalCents, 0);
  const totalTransactions = sales.length;
  const avgBasket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
  const totalUnitsSold = sales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ color: "#7c3aed" }}>
            Sales Ledger
          </div>
          <h1>Retail Sales Register</h1>
          <p className="subtitle">
            Auditable transaction records, payment reconciliation & receipt re-issuance.
          </p>
        </div>
        <CounterSaleModal
          parts={parts}
          location="RETAIL_SHOP"
          buttonLabel="+ New counter sale"
          className="btn btn-primary"
        />
      </div>

      <div className="grid four mb">
        <div className="card stat">
          <div className="label">Total Retail Revenue</div>
          <div className="value" style={{ color: "#166534" }}>
            {money(totalRevenue)}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Completed Sales</div>
          <div className="value">{totalTransactions}</div>
        </div>
        <div className="card stat">
          <div className="label">Total Units Sold</div>
          <div className="value" style={{ color: "var(--blue)" }}>
            {totalUnitsSold}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Average Sale Value</div>
          <div className="value">{money(avgBasket)}</div>
        </div>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Sales History</h2>
          <span className="pill">{sales.length} transactions</span>
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
                <th scope="col" className="no-print" style={{ textAlign: "right" }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

                const saleDetail = {
                  number: sale.number,
                  date: date(sale.createdAt),
                  customerName: sale.customerName || "Walk-in Customer",
                  customerPhone: sale.customerPhone,
                  paymentMethod: sale.paymentMethod,
                  location: sale.location,
                  totalCents: sale.totalCents,
                  sellerName: sale.seller.name,
                  items: sale.items.map((i) => ({
                    partName: i.part.name,
                    sku: i.part.sku,
                    quantity: i.quantity,
                    unitCents: i.unitCents,
                  })),
                };

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
                    <td className="no-print" style={{ textAlign: "right" }}>
                      <ReceiptViewerButton sale={saleDetail} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!sales.length && (
            <div className="empty">No sales recorded yet. Click &quot;+ New counter sale&quot; to begin.</div>
          )}
        </div>
      </section>
    </main>
  );
}
