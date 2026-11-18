type FilterablePart = {
  name: string;
  sku: string;
  active: boolean;
  stockQty: number;
  reorderLevel: number;
  shopStockQty: number;
  shopReorderLevel: number;
};

export const STOCK_FILTERS = [
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "inactive", label: "Inactive" },
] as const;

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Filters the parts table by a name/SKU search and a stock state. Stock state is judged
 * at the given location (workshop bay or retail shelf). SKUs also match ignoring dashes
 * and spaces, so "a0001" finds "A-000-1".
 */
export function filterParts<T extends FilterablePart>(parts: T[], q: string | undefined, stock: string | undefined, location: "WORKSHOP" | "RETAIL_SHOP") {
  const term = (q || "").trim().toLowerCase();
  const compactTerm = compact(term);
  return parts.filter(part => {
    if (term) {
      const matches = part.name.toLowerCase().includes(term) || part.sku.toLowerCase().includes(term) || (compactTerm && compact(part.sku).includes(compactTerm));
      if (!matches) return false;
    }
    const qty = location === "WORKSHOP" ? part.stockQty : part.shopStockQty;
    const level = location === "WORKSHOP" ? part.reorderLevel : part.shopReorderLevel;
    switch (stock) {
      case "low": return part.active && qty <= level;
      case "out": return part.active && qty === 0;
      case "inactive": return !part.active;
      default: return true;
    }
  });
}
