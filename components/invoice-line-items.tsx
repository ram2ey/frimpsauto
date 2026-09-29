"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, RotateCcw, Lock, ShieldAlert, X, Check } from "lucide-react";
import { money } from "@/lib/format";
import { updateLabor, removeLabor, updatePartItem, returnPartItem } from "@/app/billing-actions";

export interface InvoiceLineItemData {
  id: string;
  type: "PART" | "LABOR";
  description: string;
  quantity: number;
  unitCents: number;
  requestId: string | null;
}

interface InvoiceLineItemsProps {
  items: InvoiceLineItemData[];
  status: string;
  isAdmin: boolean;
}

export function InvoiceLineItems({ items, status, isAdmin }: InvoiceLineItemsProps) {
  const isDraft = status === "DRAFT";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStartEdit = (item: InvoiceLineItemData) => {
    setErrorMsg(null);
    setReturningId(null);
    setEditingId(item.id);
  };

  const handleStartReturn = (item: InvoiceLineItemData) => {
    setErrorMsg(null);
    setEditingId(null);
    setReturningId(item.id);
  };

  const handleCancel = () => {
    setErrorMsg(null);
    setEditingId(null);
    setReturningId(null);
  };

  const handleSaveLabor = (itemId: string, formData: FormData) => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updateLabor(itemId, formData);
        setEditingId(null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to update labor line.");
      }
    });
  };

  const handleSavePart = (itemId: string, formData: FormData) => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await updatePartItem(itemId, formData);
        setEditingId(null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to adjust part.");
      }
    });
  };

  const handleConfirmReturn = (itemId: string, formData: FormData) => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await returnPartItem(itemId, formData);
        setReturningId(null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to return part to stock.");
      }
    });
  };

  const handleRemoveLabor = (itemId: string) => {
    if (!confirm("Are you sure you want to remove this labor line?")) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await removeLabor(itemId);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to remove labor charge.");
      }
    });
  };

  return (
    <div className="table-wrap">
      {errorMsg && (
        <div
          className="notice error mb"
          style={{
            margin: "0 0 12px",
            padding: "8px 12px",
            background: "#fff5f5",
            border: "1px solid #feb2b2",
            color: "#c53030",
            fontSize: "0.8rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#c53030" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th scope="col" style={{ width: 90 }}>Type</th>
            <th scope="col">Description</th>
            <th scope="col" style={{ width: 80 }}>Qty</th>
            <th scope="col" style={{ width: 110 }}>Unit</th>
            <th scope="col" style={{ width: 120 }}>Total</th>
            <th scope="col" className="no-print" style={{ width: 220, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isEditing = editingId === item.id;
            const isReturning = returningId === item.id;

            if (isEditing) {
              return (
                <tr key={item.id} style={{ background: "#f8fafc" }}>
                  <td colSpan={6} style={{ padding: "12px 14px" }}>
                    <form
                      action={(formData) => {
                        if (item.type === "LABOR") handleSaveLabor(item.id, formData);
                        else handleSavePart(item.id, formData);
                      }}
                      className="stack"
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ fontSize: "0.85rem", color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Pencil size={13} aria-hidden="true" />
                          Edit {item.type === "LABOR" ? "Labor / Service Charge" : "Part Line (Admin Adjustment)"}
                        </strong>

                        {item.type === "PART" && (
                          <span
                            className="pill"
                            style={{
                              background: "#fffbeb",
                              color: "#92400e",
                              borderColor: "#fde68a",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: "0.72rem",
                            }}
                          >
                            <ShieldAlert size={12} aria-hidden="true" />
                            Inventory synced · Decreasing quantity returns items to warehouse
                          </span>
                        )}
                      </div>

                      <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                        <div>
                          <label htmlFor={`desc-${item.id}`} style={{ fontSize: "0.74rem" }}>
                            Description
                          </label>
                          <input
                            id={`desc-${item.id}`}
                            name="description"
                            defaultValue={item.description}
                            required
                            maxLength={250}
                            style={{ fontSize: "0.8rem", minHeight: "36px" }}
                          />
                        </div>
                        <div>
                          <label htmlFor={`qty-${item.id}`} style={{ fontSize: "0.74rem" }}>
                            Quantity
                          </label>
                          <input
                            id={`qty-${item.id}`}
                            name="quantity"
                            type="number"
                            min="1"
                            step="1"
                            defaultValue={item.quantity}
                            required
                            style={{ fontSize: "0.8rem", minHeight: "36px" }}
                          />
                        </div>
                        <div>
                          <label htmlFor={`price-${item.id}`} style={{ fontSize: "0.74rem" }}>
                            Unit price (GHS)
                          </label>
                          <input
                            id={`price-${item.id}`}
                            name="price"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={(item.unitCents / 100).toFixed(2)}
                            required
                            style={{ fontSize: "0.8rem", minHeight: "36px" }}
                          />
                        </div>
                      </div>

                      {item.type === "PART" && (
                        <div style={{ marginTop: 6 }}>
                          <label htmlFor={`reason-${item.id}`} style={{ fontSize: "0.74rem" }}>
                            Adjustment reason (optional note)
                          </label>
                          <input
                            id={`reason-${item.id}`}
                            name="reason"
                            placeholder="e.g. Client returned 1 spark plug unopened"
                            maxLength={300}
                            style={{ fontSize: "0.8rem", minHeight: "36px" }}
                          />
                        </div>
                      )}

                      <div className="row" style={{ marginTop: 10, gap: 8, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={handleCancel}
                          disabled={isPending}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary btn-small"
                          disabled={isPending}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <Check size={13} aria-hidden="true" />
                          <span>{isPending ? "Saving changes..." : "Save changes"}</span>
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              );
            }

            if (isReturning) {
              return (
                <tr key={item.id} style={{ background: "#fffaf0" }}>
                  <td colSpan={6} style={{ padding: "12px 14px", borderLeft: "3px solid #d97706" }}>
                    <form action={(formData) => handleConfirmReturn(item.id, formData)} className="stack">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#92400e" }}>
                        <RotateCcw size={15} aria-hidden="true" />
                        <strong style={{ fontSize: "0.86rem" }}>
                          Return {item.description} to inventory stock?
                        </strong>
                      </div>
                      <p style={{ margin: "4px 0 8px", fontSize: "0.78rem", color: "#78350f", lineHeight: 1.45 }}>
                        This will restore <strong>{item.quantity} unit{item.quantity === 1 ? "" : "s"}</strong> back to active workshop inventory, log a verifiable Stock Movement under your name, and remove this charge from the invoice.
                      </p>
                      <div>
                        <label htmlFor={`return-reason-${item.id}`} style={{ fontSize: "0.74rem" }}>
                          Return reason (optional)
                        </label>
                        <input
                          id={`return-reason-${item.id}`}
                          name="reason"
                          placeholder="e.g. Part returned unused by client / incorrect requirement"
                          maxLength={300}
                          style={{ fontSize: "0.8rem", minHeight: "36px" }}
                        />
                      </div>
                      <div className="row" style={{ marginTop: 10, gap: 8, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={handleCancel}
                          disabled={isPending}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-danger btn-small"
                          disabled={isPending}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <RotateCcw size={13} aria-hidden="true" />
                          <span>{isPending ? "Returning to stock..." : "Confirm return & remove"}</span>
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={item.id}>
                <td>
                  <span className={`pill ${item.type.toLowerCase()}`}>{item.type.toLowerCase()}</span>
                </td>
                <td style={{ fontWeight: 500 }}>{item.description}</td>
                <td>{item.quantity}</td>
                <td className="number">{money(item.unitCents)}</td>
                <td className="number" style={{ fontWeight: 600 }}>{money(item.quantity * item.unitCents)}</td>
                <td className="no-print" style={{ textAlign: "right" }}>
                  {isDraft && item.type === "LABOR" && (
                    <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => handleStartEdit(item)}
                        title="Edit labor charge"
                        disabled={isPending}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: "30px", padding: "4px 8px", fontSize: "0.74rem" }}
                      >
                        <Pencil size={12} aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-small"
                        onClick={() => handleRemoveLabor(item.id)}
                        title="Remove labor charge"
                        disabled={isPending}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: "30px", padding: "4px 8px", fontSize: "0.74rem" }}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}

                  {isDraft && item.type === "PART" && (
                    <div className="row" style={{ justifyContent: "flex-end", gap: 6, alignItems: "center" }}>
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={() => handleStartEdit(item)}
                            title="Admin: Adjust quantity or price override"
                            disabled={isPending}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: "30px", padding: "4px 8px", fontSize: "0.74rem" }}
                          >
                            <Pencil size={12} aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={() => handleStartReturn(item)}
                            title="Admin: Return part to stock"
                            disabled={isPending}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              minHeight: "30px",
                              padding: "4px 8px",
                              fontSize: "0.74rem",
                              color: "#b45309",
                              borderColor: "#fde68a",
                              background: "#fffbeb",
                            }}
                          >
                            <RotateCcw size={12} aria-hidden="true" />
                            <span>Return to stock</span>
                          </button>
                        </>
                      ) : (
                        <span
                          className="muted"
                          title="Only administrators can adjust or return issued parts"
                          style={{
                            fontSize: "0.72rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 6px",
                            background: "#f1f5f9",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <Lock size={11} aria-hidden="true" />
                          <span>Part locked (Admin only)</span>
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!items.length && (
        <div className="empty">Add labor or issue a requested part to create invoice lines.</div>
      )}
    </div>
  );
}
