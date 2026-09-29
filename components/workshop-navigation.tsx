"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, UsersRound, Package, ReceiptText, Store, UserCog, ListChecks, Settings2, CircleUserRound } from "lucide-react";

const sections = {
  dashboard: { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  jobs: { href: "/jobs", label: "Job orders", icon: ClipboardList },
  customers: { href: "/customers", label: "Customers", icon: UsersRound },
  inventory: { href: "/inventory", label: "Parts inventory", icon: Package },
  finance: { href: "/finance", label: "Finance", icon: ReceiptText },
  shop: { href: "/shop", label: "Parts Shop", icon: Store },
  team: { href: "/team", label: "Staff & access", icon: UserCog },
  checklists: { href: "/checklists", label: "Checklists", icon: ListChecks },
  settings: { href: "/settings", label: "Business details", icon: Settings2 },
  account: { href: "/account", label: "Account", icon: CircleUserRound },
};

export type WorkshopSection = keyof typeof sections;

export function WorkshopNavigation({ items, variant = "tiles", label }: { items: WorkshopSection[]; variant?: "tiles" | "utility" | "mobile"; label: string }) {
  const pathname = usePathname();
  return <nav className={`workshop-nav nav-${variant}`} aria-label={label}>
    {items.map(key => {
      const item = sections[key];
      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return <Link key={key} href={item.href} className={`nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
        <item.icon size={19} strokeWidth={1.5} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}

export function WorkshopPageLabel() {
  const pathname = usePathname();
  const section = Object.values(sections).find(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return <span className="crumb">Workshop <span aria-hidden="true">/</span> <strong>{section?.label || "Overview"}</strong></span>;
}
