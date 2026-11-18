import { Search } from "lucide-react";
import { LiveSearchForm } from "@/components/live-search-form";
import { STOCK_FILTERS } from "@/lib/part-filter";

/** Live name/SKU search and stock-state filter shared by the workshop and shop inventory pages. */
export function PartSearchForm({ q, stock }: { q?: string; stock?: string }) {
  return (
    <LiveSearchForm className="row wrap mb">
      <div style={{ flex: "1 1 260px", maxWidth: 380 }}>
        <label htmlFor="part-q">Search part name or SKU</label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input id="part-q" name="q" defaultValue={q || ""} placeholder="e.g. brake pad, A0004201220..." autoComplete="off" style={{ paddingLeft: "36px" }} />
          <Search size={16} aria-hidden="true" style={{ position: "absolute", left: "12px", color: "var(--muted)", pointerEvents: "none" }} />
        </div>
      </div>
      <div style={{ width: 170 }}>
        <label htmlFor="part-stock">Stock</label>
        <select id="part-stock" name="stock" defaultValue={stock || ""}>
          <option value="">All parts</option>
          {STOCK_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
        </select>
      </div>
    </LiveSearchForm>
  );
}
