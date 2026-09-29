"use client";

import { useState, useRef, useTransition } from "react";
import { ShoppingCart, Plus, Trash2, Printer, X, Check, AlertCircle } from "lucide-react";
import { money } from "@/lib/format";
import { createDirectSale } from "@/app/sale-actions";

export interface SalePartOption {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  stockQty: number;      // Workshop bay stock
  shopStockQty: number;  // Retail parts shop stock
}

interface CartItem {
  partId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number; // in GHS
}

interface CounterSaleModalProps {
  parts: SalePartOption[];
  location?: "WORKSHOP" | "RETAIL_SHOP";
  buttonLabel?: string;
  className?: string;
}

export function CounterSaleModal({
  parts,
  location = "WORKSHOP",
  buttonLabel = "Direct counter sale",
  className = "btn btn-primary",
}: CounterSaleModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");

  // Line item selector state
  const [selectedPartId, setSelectedPartId] = useState<string>(parts[0]?.id || "");
  const [itemQty, setItemQty] = useState<number>(1);
  const [overridePrice, setOverridePrice] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<{
    saleId: string;
    number: number;
    total: number;
    items: CartItem[];
    customerName: string;
    customerPhone?: string;
    paymentMethod: string;
    location: string;
    date: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const selectedPart = parts.find((p) => p.id === selectedPartId) || parts[0];
  const availableStock = selectedPart
    ? location === "WORKSHOP"
      ? selectedPart.stockQty
      : selectedPart.shopStockQty
    : 0;

  const currentPriceGhs = selectedPart ? (selectedPart.priceCents / 100).toFixed(2) : "0.00";
  const activePriceGhs = overridePrice !== "" ? overridePrice : currentPriceGhs;

  const openModal = () => {
    setErrorMsg(null);
    setCompletedSale(null);
    setCart([]);
    setCustomerName("Walk-in Customer");
    setCustomerPhone("");
    setPaymentMethod("Cash");
    setNotes("");
    setItemQty(1);
    setOverridePrice("");
    setIsOpen(true);
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
    setIsOpen(false);
  };

  const handleAddToCart = () => {
    setErrorMsg(null);
    if (!selectedPart) return;

    if (itemQty <= 0) {
      setErrorMsg("Quantity must be at least 1.");
      return;
    }

    const currentInCart = cart.find((i) => i.partId === selectedPart.id)?.quantity || 0;
    if (currentInCart + itemQty > availableStock) {
      setErrorMsg(`Cannot add ${itemQty} units. Only ${availableStock} units available in stock (${currentInCart} already in cart).`);
      return;
    }

    const priceNum = Math.max(0, Number(activePriceGhs) || 0);

    setCart((prev) => {
      const existing = prev.find((i) => i.partId === selectedPart.id);
      if (existing) {
        return prev.map((i) =>
          i.partId === selectedPart.id
            ? { ...i, quantity: i.quantity + itemQty, unitPrice: priceNum }
            : i
        );
      }
      return [
        ...prev,
        {
          partId: selectedPart.id,
          sku: selectedPart.sku,
          name: selectedPart.name,
          quantity: itemQty,
          unitPrice: priceNum,
        },
      ];
    });

    setItemQty(1);
    setOverridePrice("");
  };

  const handleRemoveFromCart = (partId: string) => {
    setCart((prev) => prev.filter((i) => i.partId !== partId));
  };

  const totalGhs = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleCompleteSale = () => {
    setErrorMsg(null);
    if (!cart.length) {
      setErrorMsg("Cart is empty. Add at least one part to proceed.");
      return;
    }

    const formData = new FormData();
    formData.set("location", location);
    formData.set("customerName", customerName);
    if (customerPhone) formData.set("customerPhone", customerPhone);
    formData.set("paymentMethod", paymentMethod);
    if (notes) formData.set("notes", notes);
    formData.set(
      "itemsJson",
      JSON.stringify(
        cart.map((c) => ({
          partId: c.partId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        }))
      )
    );

    startTransition(async () => {
      try {
        const res = await createDirectSale(formData);
        setCompletedSale({
          saleId: res.saleId,
          number: res.saleNumber,
          total: totalGhs,
          items: [...cart],
          customerName,
          customerPhone,
          paymentMethod,
          location: location === "WORKSHOP" ? "Workshop Counter" : "Retail Parts Shop",
          date: new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to record sale.");
      }
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={openModal}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ShoppingCart size={15} aria-hidden="true" />
        <span>{buttonLabel}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="modal-dialog"
        onClose={() => setIsOpen(false)}
        style={{ maxWidth: completedSale ? 480 : 640 }}
      >
        {isOpen && (
          <div className="modal-card">
            {completedSale ? (
              /* Receipt View */
              <div>
                <div style={{ textAlign: "center", paddingBottom: 16, borderBottom: "1.5px dashed #cbd5e1" }}>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", letterSpacing: "0.02em" }}>FRIMPS AUTO</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>
                    {completedSale.location} · Sales Receipt
                  </p>
                  <div
                    style={{
                      marginTop: 8,
                      display: "inline-block",
                      padding: "2px 8px",
                      background: "#f1f5f9",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    REC-{String(completedSale.number).padStart(5, "0")}
                  </div>
                  <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--muted)" }}>
                    Date: {completedSale.date}
                  </div>
                </div>

                <div style={{ padding: "12px 0", fontSize: "0.78rem", borderBottom: "1px dashed #cbd5e1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Customer:</span>
                    <strong>{completedSale.customerName}</strong>
                  </div>
                  {completedSale.customerPhone && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span className="muted">Phone:</span>
                      <span>{completedSale.customerPhone}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span className="muted">Payment Method:</span>
                    <span>{completedSale.paymentMethod}</span>
                  </div>
                </div>

                {/* Items summary */}
                <table className="table" style={{ marginTop: 10, fontSize: "0.8rem", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "4px 0" }}>Item</th>
                      <th style={{ textAlign: "center", padding: "4px 0", width: 45 }}>Qty</th>
                      <th style={{ textAlign: "right", padding: "4px 0", width: 75 }}>Price</th>
                      <th style={{ textAlign: "right", padding: "4px 0", width: 85 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedSale.items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "6px 0" }}>
                          <div>{it.name}</div>
                          <small className="muted">{it.sku}</small>
                        </td>
                        <td style={{ textAlign: "center", padding: "6px 0" }}>{it.quantity}</td>
                        <td style={{ textAlign: "right", padding: "6px 0" }}>
                          {money(Math.round(it.unitPrice * 100))}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, padding: "6px 0" }}>
                          {money(Math.round(it.quantity * it.unitPrice * 100))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    marginTop: 8,
                    borderTop: "1.5px solid var(--ink)",
                    fontSize: "1.05rem",
                  }}
                >
                  <strong>Total Paid:</strong>
                  <strong style={{ fontSize: "1.2rem", color: "var(--blue)" }}>
                    {money(Math.round(completedSale.total * 100))}
                  </strong>
                </div>

                <div className="modal-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handlePrintReceipt}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Printer size={15} />
                    <span>Print Receipt</span>
                  </button>
                </div>
              </div>
            ) : (
              /* POS Checkout Screen */
              <div>
                <div className="modal-header">
                  <div>
                    <h3>
                      Direct Counter Sale ({location === "WORKSHOP" ? "Workshop Counter" : "Retail Parts Shop"})
                    </h3>
                    <p className="modal-subtitle">
                      Sell parts directly over the counter without a vehicle repair job order.
                    </p>
                  </div>
                  <button type="button" className="modal-close-btn" onClick={closeModal}>
                    <X size={16} />
                  </button>
                </div>

                {errorMsg && (
                  <div
                    className="modal-warning-box"
                    style={{ background: "#fff5f5", borderColor: "#feb2b2", color: "#c53030" }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="stack" style={{ marginTop: 14, gap: 14 }}>
                  {/* Customer Information */}
                  <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label htmlFor="pos-cust-name" style={{ fontSize: "0.75rem" }}>
                        Customer Name
                      </label>
                      <input
                        id="pos-cust-name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Walk-in Customer"
                        required
                        style={{ fontSize: "0.8rem", minHeight: "36px" }}
                      />
                    </div>
                    <div>
                      <label htmlFor="pos-cust-phone" style={{ fontSize: "0.75rem" }}>
                        Customer Phone (Optional)
                      </label>
                      <input
                        id="pos-cust-phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. +233 20 000 0000"
                        style={{ fontSize: "0.8rem", minHeight: "36px" }}
                      />
                    </div>
                  </div>

                  {/* Add Part to Cart Bar */}
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                      <strong style={{ fontSize: "0.8rem", color: "var(--ink)" }}>Add Part to Sale</strong>
                      {selectedPart && (
                        <span
                          style={{
                            fontSize: "0.74rem",
                            color: availableStock === 0 ? "#c53030" : "var(--blue)",
                            fontWeight: 600,
                          }}
                        >
                          {availableStock} in {location === "WORKSHOP" ? "workshop" : "shop"} stock
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div style={{ flex: "2 1 200px" }}>
                        <select
                          value={selectedPartId}
                          onChange={(e) => {
                            setSelectedPartId(e.target.value);
                            setOverridePrice("");
                          }}
                          style={{ fontSize: "0.8rem", minHeight: "36px" }}
                        >
                          {parts.map((p) => {
                            const stock = location === "WORKSHOP" ? p.stockQty : p.shopStockQty;
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} · {p.sku} ({money(p.priceCents)}) [Stock: {stock}]
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div style={{ width: 70 }}>
                        <input
                          type="number"
                          min="1"
                          max={Math.max(1, availableStock)}
                          value={itemQty}
                          onChange={(e) => setItemQty(Number(e.target.value))}
                          placeholder="Qty"
                          title="Quantity"
                          style={{ fontSize: "0.8rem", minHeight: "36px" }}
                        />
                      </div>

                      <div style={{ width: 95 }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={activePriceGhs}
                          onChange={(e) => setOverridePrice(e.target.value)}
                          placeholder="Price (GHS)"
                          title="Unit price override"
                          style={{ fontSize: "0.8rem", minHeight: "36px" }}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={handleAddToCart}
                        disabled={availableStock === 0}
                        style={{
                          minHeight: "36px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.78rem",
                        }}
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Cart Table */}
                  <div className="table-wrap">
                    <table className="table" style={{ fontSize: "0.8rem", width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th style={{ width: 60, textAlign: "center" }}>Qty</th>
                          <th style={{ width: 85, textAlign: "right" }}>Price</th>
                          <th style={{ width: 95, textAlign: "right" }}>Total</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item) => (
                          <tr key={item.partId}>
                            <td>
                              <div>{item.name}</div>
                              <small className="muted">{item.sku}</small>
                            </td>
                            <td style={{ textAlign: "center" }}>{item.quantity}</td>
                            <td style={{ textAlign: "right" }}>
                              {money(Math.round(item.unitPrice * 100))}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                              {money(Math.round(item.quantity * item.unitPrice * 100))}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.partId)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#c53030",
                                  cursor: "pointer",
                                }}
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!cart.length && (
                      <div className="empty" style={{ padding: "14px", fontSize: "0.78rem" }}>
                        No parts added to cart yet. Select part above and click &quot;Add&quot;.
                      </div>
                    )}
                  </div>

                  {/* Payment and checkout footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 14px",
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label htmlFor="pos-pay-method" style={{ fontSize: "0.75rem", margin: 0 }}>
                        Payment:
                      </label>
                      <select
                        id="pos-pay-method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ fontSize: "0.8rem", minHeight: "34px", width: 140 }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Mobile money">Mobile money</option>
                        <option value="Card">Card</option>
                        <option value="Bank transfer">Bank transfer</option>
                      </select>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="muted" style={{ fontSize: "0.75rem", display: "block" }}>
                        Total Amount
                      </span>
                      <strong style={{ fontSize: "1.2rem", color: "var(--blue)" }}>
                        {money(Math.round(totalGhs * 100))}
                      </strong>
                    </div>
                  </div>

                  <div className="modal-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCompleteSale}
                      disabled={isPending || !cart.length}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <Check size={14} />
                      <span>{isPending ? "Recording sale..." : "Complete & generate receipt"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
