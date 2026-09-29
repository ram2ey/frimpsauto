"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Package, ReceiptText, ArrowLeftRight } from "lucide-react";

export const shopSections = {
  pos: { href: "/shop", label: "POS Register", icon: ShoppingCart },
  inventory: { href: "/shop/inventory", label: "Shelf Stock", icon: Package },
  sales: { href: "/shop/sales", label: "Sales Register", icon: ReceiptText },
  transfers: { href: "/shop/transfers", label: "Transfers", icon: ArrowLeftRight },
};

export type ShopSectionKey = keyof typeof shopSections;

export function ShopNavigation({
  variant = "tiles",
  label = "Shop navigation",
}: {
  variant?: "tiles" | "utility" | "mobile";
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={`workshop-nav nav-${variant}`} aria-label={label}>
      {(Object.keys(shopSections) as ShopSectionKey[]).map((key) => {
        const item = shopSections[key];
        const active =
          item.href === "/shop"
            ? pathname === "/shop"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={key}
            href={item.href}
            className={`nav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <item.icon size={19} strokeWidth={1.5} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ShopPageLabel() {
  const pathname = usePathname();
  const section = Object.values(shopSections).find((item) =>
    item.href === "/shop"
      ? pathname === "/shop"
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <span className="crumb">
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#f3e8ff",
          color: "#6b21a8",
          padding: "2px 8px",
          fontWeight: 700,
          fontSize: "0.74rem",
          letterSpacing: "0.02em",
        }}
      >
        RETAIL PARTS SHOP
      </span>{" "}
      <span aria-hidden="true">/</span> <strong>{section?.label || "POS Register"}</strong>
    </span>
  );
}
