"use client";

import { useState, useRef, useTransition } from "react";
import { ArrowLeftRight, X, Check, AlertCircle } from "lucide-react";
import { createStockTransfer } from "@/app/transfer-actions";

export interface TransferPartOption {
  id: string;
  sku: string;
  name: string;
  stockQty: number;      // Workshop bay stock
  shopStockQty: number;  // Retail parts shop stock
}

interface StockTransferModalProps {
  parts: TransferPartOption[];
  defaultFrom?: "WORKSHOP" | "RETAIL_SHOP";
  buttonLabel?: string;
  className?: string;
}

export function StockTransferModal({
  parts,
  defaultFrom = "RETAIL_SHOP",
  buttonLabel = "Transfer stock",
  className = "btn btn-secondary",
}: StockTransferModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [fromLoc, setFromLoc] = useState<"WORKSHOP" | "RETAIL_SHOP">(defaultFrom);
  const [selectedPartId, setSelectedPartId] = useState<string>(parts[0]?.id || "");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toLoc = fromLoc === "WORKSHOP" ? "RETAIL_SHOP" : "WORKSHOP";
  const selectedPart = parts.find((p) => p.id === selectedPartId) || parts[0];

  const availableStock = selectedPart
    ? fromLoc === "WORKSHOP"
      ? selectedPart.stockQty
      : selectedPart.shopStockQty
    : 0;

  const destStock = selectedPart
    ? toLoc === "WORKSHOP"
      ? selectedPart.stockQty
      : selectedPart.shopStockQty
    : 0;

  const openModal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setQuantity(1);
    setIsOpen(true);
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
    setIsOpen(false);
  };

  const handleSwapDirections = () => {
    setFromLoc((prev) => (prev === "WORKSHOP" ? "RETAIL_SHOP" : "WORKSHOP"));
    setQuantity(1);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedPartId) {
      setErrorMsg("Please select a part to transfer.");
      return;
    }
    if (quantity <= 0) {
      setErrorMsg("Quantity must be at least 1.");
      return;
    }
    if (quantity > availableStock) {
      setErrorMsg(`Cannot transfer ${quantity} units. Only ${availableStock} units available at source.`);
      return;
    }

    const formData = new FormData();
    formData.set("partId", selectedPartId);
    formData.set("fromLocation", fromLoc);
    formData.set("toLocation", toLoc);
    formData.set("quantity", String(quantity));
    formData.set("notes", notes);

    startTransition(async () => {
      try {
        const res = await createStockTransfer(formData);
        setSuccessMsg(`Transfer #TRF-${String(res.number).padStart(4, "0")} completed successfully!`);
        setTimeout(() => {
          closeModal();
        }, 1200);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to execute transfer.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={openModal}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeftRight size={15} aria-hidden="true" />
        <span>{buttonLabel}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="modal-dialog"
        onClose={() => setIsOpen(false)}
        style={{ maxWidth: 540 }}
      >
        {isOpen && (
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3>Inter-Branch Stock Transfer</h3>
                <p className="modal-subtitle">
                  Move parts between Workshop Bay and Retail Parts Shop with atomic stock synchronization.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModal}
                aria-label="Close transfer dialog"
              >
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

            {successMsg && (
              <div
                className="modal-warning-box"
                style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}
              >
                <Check size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="stack" style={{ marginTop: 14 }}>
              {/* Transfer direction banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <small className="muted" style={{ display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>
                    From (Sending)
                  </small>
                  <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>
                    {fromLoc === "WORKSHOP" ? "Workshop Bay" : "Retail Parts Shop"}
                  </strong>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={handleSwapDirections}
                  title="Reverse transfer direction"
                  style={{
                    padding: "4px 8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.75rem",
                  }}
                >
                  <ArrowLeftRight size={13} />
                  <span>Swap</span>
                </button>

                <div style={{ flex: 1, textAlign: "right" }}>
                  <small className="muted" style={{ display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>
                    To (Receiving)
                  </small>
                  <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>
                    {toLoc === "WORKSHOP" ? "Workshop Bay" : "Retail Parts Shop"}
                  </strong>
                </div>
              </div>

              {/* Part selection */}
              <div>
                <label htmlFor="transfer-part-select">Select Part</label>
                <select
                  id="transfer-part-select"
                  value={selectedPartId}
                  onChange={(e) => {
                    setSelectedPartId(e.target.value);
                    setQuantity(1);
                  }}
                  required
                >
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.sku} (Workshop: {p.stockQty} | Shop: {p.shopStockQty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live stock indicator */}
              {selectedPart && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    padding: "10px 12px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                  }}
                >
                  <div>
                    <span className="muted" style={{ display: "block", fontSize: "0.72rem" }}>
                      Source Available Stock:
                    </span>
                    <strong
                      style={{
                        fontSize: "1.1rem",
                        color: availableStock === 0 ? "#c53030" : "var(--ink)",
                      }}
                    >
                      {availableStock} unit{availableStock === 1 ? "" : "s"}
                    </strong>
                  </div>
                  <div>
                    <span className="muted" style={{ display: "block", fontSize: "0.72rem" }}>
                      Destination Current Stock:
                    </span>
                    <strong style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
                      {destStock} unit{destStock === 1 ? "" : "s"}
                    </strong>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label htmlFor="transfer-qty">Quantity to Transfer</label>
                <input
                  id="transfer-qty"
                  type="number"
                  min="1"
                  max={Math.max(1, availableStock)}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="transfer-notes">Transfer Note / Reason (Optional)</label>
                <input
                  id="transfer-notes"
                  placeholder="e.g. Needed for job bay or restocking retail display"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={300}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPending || availableStock === 0}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <ArrowLeftRight size={14} />
                  <span>{isPending ? "Transferring stock..." : "Execute transfer"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>
    </>
  );
}
