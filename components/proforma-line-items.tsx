"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { money } from "@/lib/format";
import { removeProformaLine, updateProformaLine } from "@/app/proforma-actions";

export interface ProformaLineItemData {
  id: string;
  type: "PART" | "LABOR" | "ITEM";
  description: string;
  quantity: number;
  unitCents: number;
}

const buttonStyle = { display: "inline-flex", alignItems: "center", gap: 4, minHeight: "30px", padding: "4px 8px", fontSize: "0.74rem" };

export function ProformaLineItems({ items, canEdit, reopensRevision }: { items: ProformaLineItemData[]; canEdit: boolean; reopensRevision: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmReopen = () => !reopensRevision || confirm("This proforma has already gone to the customer. Changing it starts a new revision that needs to be sent again. Continue?");

  const save = (itemId: string, formData: FormData) => {
    if (!confirmReopen()) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateProformaLine(itemId, formData);
      if (!res.ok) return setErrorMsg(res.error);
      setEditingId(null);
    });
  };

  const remove = (itemId: string) => {
    if (!confirm("Remove this line from the proforma?") || !confirmReopen()) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await removeProformaLine(itemId);
      if (!res.ok) setErrorMsg(res.error);
    });
  };

  return (
    <div className="table-wrap">
      {errorMsg && (
        <div className="notice" role="alert" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff5f5", borderColor: "#feb2b2", color: "#c53030" }}>
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
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
            {canEdit && <th scope="col" className="no-print" style={{ width: 170, textAlign: "right" }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(item =>
            editingId === item.id ? (
              <tr key={item.id} style={{ background: "#f8fafc" }}>
                <td colSpan={6} style={{ padding: "12px 14px" }}>
                  <form action={formData => save(item.id, formData)} className="stack">
                    <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <label htmlFor={`pf-desc-${item.id}`}>Description</label>
                        <input id={`pf-desc-${item.id}`} name="description" defaultValue={item.description} required maxLength={250} />
                      </div>
                      <div>
                        <label htmlFor={`pf-qty-${item.id}`}>Quantity</label>
                        <input id={`pf-qty-${item.id}`} name="quantity" type="number" min="1" step="1" defaultValue={item.quantity} required />
                      </div>
                      <div>
                        <label htmlFor={`pf-price-${item.id}`}>Unit price (GHS)</label>
                        <input id={`pf-price-${item.id}`} name="price" type="number" min="0" step="0.01" defaultValue={(item.unitCents / 100).toFixed(2)} required />
                      </div>
                    </div>
                    <div className="row" style={{ marginTop: 10, gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditingId(null)} disabled={isPending}>Cancel</button>
                      <button type="submit" className="btn btn-primary btn-small" disabled={isPending} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Check size={13} aria-hidden="true" />
                        <span>{isPending ? "Saving..." : "Save changes"}</span>
                      </button>
                    </div>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={item.id}>
                <td><span className={`pill ${item.type.toLowerCase()}`}>{item.type.toLowerCase()}</span></td>
                <td style={{ fontWeight: 500 }}>{item.description}</td>
                <td>{item.quantity}</td>
                <td className="number">{money(item.unitCents)}</td>
                <td className="number" style={{ fontWeight: 600 }}>{money(item.quantity * item.unitCents)}</td>
                {canEdit && (
                  <td className="no-print" style={{ textAlign: "right" }}>
                    <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => { setErrorMsg(null); setEditingId(item.id); }} disabled={isPending} style={buttonStyle}>
                        <Pencil size={12} aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                      <button type="button" className="btn btn-danger btn-small" onClick={() => remove(item.id)} disabled={isPending} style={buttonStyle}>
                        <Trash2 size={12} aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ),
          )}
        </tbody>
      </table>
      {!items.length && <div className="empty">Add parts and labor to build the quote.</div>}
    </div>
  );
}
