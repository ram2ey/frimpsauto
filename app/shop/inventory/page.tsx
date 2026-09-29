import { PackagePlus, Truck } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { adjustStock, createPart } from "@/app/inventory-actions";
import { StockTransferModal } from "@/components/stock-transfer-modal";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export default async function ShopInventoryPage() {
  await requireRole([Role.SHOP_STAFF, Role.FINANCE]);

  const parts = await db.part.findMany({ orderBy: { name: "asc" } });

  const totalShelfStock = parts.reduce((sum, p) => sum + p.shopStockQty, 0);
  const totalWorkshopStock = parts.reduce((sum, p) => sum + p.stockQty, 0);
  const lowShelfStock = parts.filter((p) => p.active && p.shopStockQty <= p.shopReorderLevel).length;

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ color: "#7c3aed" }}>
            Retail Inventory
          </div>
          <h1>Shelf Stock & Inventory</h1>
          <p className="subtitle">
            Manage retail shelf quantities, receive supplier deliveries, and transfer parts with the workshop bay.
          </p>
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <StockTransferModal
            parts={parts}
            defaultFrom="WORKSHOP"
            buttonLabel="Pull from Workshop"
            className="btn btn-secondary"
          />
          <a href="#receive-delivery" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Truck size={14} />
            <span>Receive Delivery</span>
          </a>
        </div>
      </div>

      <div className="grid four mb">
        <div className="card stat">
          <div className="label">Catalog Parts</div>
          <div className="value">{parts.length}</div>
        </div>
        <div className="card stat">
          <div className="label">Retail Shelf Units</div>
          <div className="value" style={{ color: "#7c3aed" }}>
            {totalShelfStock}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Workshop Bay Units</div>
          <div className="value" style={{ color: "var(--blue)" }}>
            {totalWorkshopStock}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Low Shelf Stock</div>
          <div className="value" style={{ color: lowShelfStock > 0 ? "#b45309" : undefined }}>
            {lowShelfStock}
          </div>
        </div>
      </div>

      {/* Shelf Stock Table */}
      <section className="card mb">
        <div className="section-title">
          <h2>Retail Shelf Inventory</h2>
          <span className="pill waiting_parts">{lowShelfStock} low stock</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Part Name</th>
                <th scope="col">SKU</th>
                <th scope="col" className="number">Retail Price</th>
                <th scope="col" className="number">Shop Shelf Stock</th>
                <th scope="col" className="number">Workshop Bay Stock</th>
                <th scope="col">Shelf Status</th>
                <th scope="col" className="no-print" style={{ textAlign: "right" }}>Inter-Branch Action</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => {
                const isOutOfStock = part.shopStockQty === 0;
                const isLow = part.shopStockQty <= part.shopReorderLevel;

                return (
                  <tr key={part.id}>
                    <td>
                      <strong>{part.name}</strong>
                    </td>
                    <td><span className="mono">{part.sku}</span></td>
                    <td className="number">{money(part.priceCents)}</td>
                    <td className="number" style={{ fontWeight: 700 }}>
                      <span style={{ color: isOutOfStock ? "#c53030" : isLow ? "#b45309" : "#166534" }}>
                        {part.shopStockQty}
                      </span>
                      <small className="muted" style={{ display: "block", fontSize: "0.7rem", fontWeight: 400 }}>
                        min {part.shopReorderLevel}
                      </small>
                    </td>
                    <td className="number" style={{ color: "var(--blue)" }}>
                      {part.stockQty}
                    </td>
                    <td>
                      <span
                        className={`pill ${
                          !part.active
                            ? "rejected"
                            : isOutOfStock
                            ? "rejected"
                            : isLow
                            ? "waiting_parts"
                            : "approved"
                        }`}
                      >
                        {!part.active
                          ? "Inactive"
                          : isOutOfStock
                          ? "Out of stock"
                          : isLow
                          ? "Low stock"
                          : "Available"}
                      </span>
                    </td>
                    <td className="no-print" style={{ textAlign: "right" }}>
                      <StockTransferModal
                        parts={[part]}
                        defaultFrom="WORKSHOP"
                        buttonLabel={part.shopStockQty === 0 && part.stockQty > 0 ? "Pull from Workshop" : "Transfer"}
                        className="btn btn-secondary btn-small"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!parts.length && <div className="empty">No parts in the catalog yet.</div>}
        </div>
      </section>

      {/* Stock Operations Grid: Receive Delivery & Add Part */}
      <div className="grid two">
        {/* Receive Supplier Delivery into Shop */}
        <section className="card" id="receive-delivery">
          <div className="section-title">
            <div>
              <h2>Receive Stock Delivery</h2>
              <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                Record incoming parts delivered directly by suppliers to the retail shop.
              </p>
            </div>
            <Truck size={19} color="#7c3aed" />
          </div>

          <form action={async (formData: FormData) => {
            "use server";
            formData.set("location", "RETAIL_SHOP");
            const partId = String(formData.get("partId"));
            await adjustStock(partId, formData);
          }} className="stack" style={{ gap: 14 }}>
            <input type="hidden" name="location" value="RETAIL_SHOP" />

            <div>
              <label htmlFor="del-part-id">Select Part</label>
              <select id="del-part-id" name="partId" required>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.sku} (Current shelf: {p.shopStockQty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="del-qty">Quantity Delivered (Whole units)</label>
              <input
                id="del-qty"
                name="delta"
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 20"
              />
            </div>

            <div>
              <label htmlFor="del-reason">Supplier / Delivery Reference</label>
              <input
                id="del-reason"
                name="reason"
                required
                maxLength={300}
                placeholder="e.g. Delivered by MaxAuto Ltd · Waybill #88419"
              />
            </div>

            <SubmitButton pendingLabel="Receiving delivery..." style={{ alignSelf: "start" }}>
              Confirm stock intake
            </SubmitButton>
          </form>
        </section>

        {/* Add New Catalog Part */}
        <section className="card">
          <div className="section-title">
            <div>
              <h2>Add New Catalog SKU</h2>
              <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                Introduce a new part number with initial retail shelf allocation.
              </p>
            </div>
            <PackagePlus size={19} />
          </div>

          <form action={async (formData: FormData) => {
            "use server";
            formData.set("location", "RETAIL_SHOP");
            await createPart(formData);
          }} className="stack" style={{ gap: 14 }}>
            <input type="hidden" name="location" value="RETAIL_SHOP" />

            <div>
              <label htmlFor="new-sku">SKU / Part Number</label>
              <input id="new-sku" name="sku" required maxLength={60} placeholder="e.g. SPK-NGK-774" />
            </div>

            <div>
              <label htmlFor="new-name">Part Name & Description</label>
              <input id="new-name" name="name" required maxLength={160} placeholder="e.g. NGK Iridium Spark Plug" />
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label htmlFor="new-price">Unit Price (GHS)</label>
                <input id="new-price" name="price" type="number" step="0.01" min="0" required placeholder="0.00" />
              </div>
              <div>
                <label htmlFor="new-qty">Initial Shelf Stock</label>
                <input id="new-qty" name="stockQty" type="number" step="1" min="0" defaultValue="0" required />
              </div>
            </div>

            <div>
              <label htmlFor="new-reorder">Shelf Reorder Alert Level</label>
              <input id="new-reorder" name="reorderLevel" type="number" step="1" min="0" defaultValue="5" required />
            </div>

            <SubmitButton pendingLabel="Saving SKU..." style={{ alignSelf: "start" }}>
              Add to catalog
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
