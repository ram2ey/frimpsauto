"use client";

import { useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { money } from "@/lib/format";

export interface SaleDetailItem {
  partName: string;
  sku: string;
  quantity: number;
  unitCents: number;
}

export interface SaleDetail {
  number: number;
  date: string;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentMethod: string;
  location: string;
  totalCents: number;
  sellerName: string;
  items: SaleDetailItem[];
}

export function ReceiptViewerButton({ sale }: { sale: SaleDetail }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true);
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-small"
        onClick={openModal}
        title="View and print sales receipt"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          minHeight: "30px",
          padding: "4px 8px",
          fontSize: "0.74rem",
        }}
      >
        <Printer size={13} aria-hidden="true" />
        <span>Receipt</span>
      </button>

      <dialog
        ref={dialogRef}
        className="modal-dialog"
        onClose={() => setIsOpen(false)}
        style={{ maxWidth: 460 }}
      >
        {isOpen && (
          <div className="modal-card">
            <div style={{ textAlign: "right", marginBottom: 6 }}>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModal}
                aria-label="Close receipt"
                style={{ marginLeft: "auto" }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ textAlign: "center", paddingBottom: 14, borderBottom: "1.5px dashed #cbd5e1" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", letterSpacing: "0.02em" }}>FRIMPS AUTO</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>
                {sale.location === "WORKSHOP" ? "Workshop Counter" : "Retail Parts Shop"} · Sales Receipt
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
                REC-{String(sale.number).padStart(5, "0")}
              </div>
              <div style={{ marginTop: 4, fontSize: "0.72rem", color: "var(--muted)" }}>
                Date: {sale.date}
              </div>
            </div>

            <div style={{ padding: "10px 0", fontSize: "0.78rem", borderBottom: "1px dashed #cbd5e1" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Customer:</span>
                <strong>{sale.customerName}</strong>
              </div>
              {sale.customerPhone && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span className="muted">Phone:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span className="muted">Payment:</span>
                <span>{sale.paymentMethod}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span className="muted">Cashier:</span>
                <span>{sale.sellerName}</span>
              </div>
            </div>

            {/* Items */}
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
                {sale.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: "6px 0" }}>
                      <div>{item.partName}</div>
                      <small className="muted">{item.sku}</small>
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 0" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", padding: "6px 0" }}>
                      {money(item.unitCents)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, padding: "6px 0" }}>
                      {money(item.quantity * item.unitCents)}
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
                {money(sale.totalCents)}
              </strong>
            </div>

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
