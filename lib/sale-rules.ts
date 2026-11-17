/** Only these roles may set or change any price: catalog prices and counter-sale prices. Everyone else sells at the catalog price. */
export const PRICING_ROLES = ["FINANCE", "ADMIN"] as const;

export function canSetPrices(role: string) {
  return (PRICING_ROLES as readonly string[]).includes(role);
}
export const MAX_SALE_LINES = 50;
export const MAX_LINE_QUANTITY = 10000;
