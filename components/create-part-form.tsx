"use client";

import { useActionState } from "react";
import { createPartWithFeedback } from "@/app/inventory-actions";
import { SubmitButton } from "@/components/submit-button";

const initialState: { error: string | null; success: boolean } = { error: null, success: false };

export function CreatePartForm({ location, retail = false }: { location: "WORKSHOP" | "RETAIL_SHOP"; retail?: boolean }) {
  const [state, action] = useActionState(createPartWithFeedback, initialState);

  return (
    <form action={action} className={retail ? "stack" : "form-grid"} style={retail ? { gap: 14 } : undefined}>
      <input type="hidden" name="location" value={location} />
      {state.error && <div className="notice" role="alert">{state.error}</div>}
      {state.success && <div className="notice success" role="status">Part added to the catalog.</div>}

      <div>
        <label htmlFor="new-part-sku">SKU / part number</label>
        <input id="new-part-sku" name="sku" required maxLength={60} placeholder={retail ? "e.g. SPK-NGK-774" : "e.g. BRK-PAD-001"} />
      </div>
      <div>
        <label htmlFor="new-part-name">Part name</label>
        <input id="new-part-name" name="name" required maxLength={160} placeholder={retail ? "e.g. NGK Iridium Spark Plug" : "e.g. Front Ceramic Brake Pads"} />
      </div>
      <div className={retail ? "form-grid" : "create-part-fields"} style={retail ? { gridTemplateColumns: "1fr 1fr" } : undefined}>
        <div>
          <label htmlFor="new-part-price">Unit price (GHS)</label>
          <input id="new-part-price" name="price" type="number" step="0.01" min="0" required placeholder="0.00" />
        </div>
        <div>
          <label htmlFor="new-part-stock">{retail ? "Initial shelf stock" : "Opening quantity"}</label>
          <input id="new-part-stock" name="stockQty" type="number" step="1" min="0" defaultValue="0" required />
        </div>
      </div>
      <div>
        <label htmlFor="new-part-reorder">{retail ? "Shelf reorder alert level" : "Reorder alert level"}</label>
        <input id="new-part-reorder" name="reorderLevel" type="number" step="1" min="0" defaultValue={retail ? "5" : "0"} required />
      </div>
      <div style={{ alignSelf: "end" }}>
        <SubmitButton pendingLabel="Adding part...">{retail ? "Add to catalog" : "Add part"}</SubmitButton>
      </div>
    </form>
  );
}
