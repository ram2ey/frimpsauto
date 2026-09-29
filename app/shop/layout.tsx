import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ArrowUpRight, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { Role } from "@/generated/prisma/client";
import { BrandLogo } from "@/components/brand-logo";
import { ShopNavigation, ShopPageLabel } from "@/components/shop-navigation";

const allowedRoles: Role[] = [Role.SHOP_STAFF, Role.ADMIN, Role.FINANCE];

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  const isWorkshopManager = user.role === Role.ADMIN || user.role === Role.FINANCE;
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <div className="shell">
      <a className="skip-link" href="#shop-content">
        Skip to content
      </a>

      <aside className="sidebar">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Link href="/shop" className="brand-link" aria-label="Frimps Auto Retail Shop">
            <BrandLogo priority />
          </Link>
          <div
            style={{
              background: "#f3e8ff",
              color: "#6b21a8",
              fontSize: "0.68rem",
              fontWeight: 800,
              padding: "2px 8px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Parts Shop
          </div>
        </div>

        <div className="sidebar-menu" style={{ marginTop: 16 }}>
          <ShopNavigation label="Shop navigation" />

          {isWorkshopManager && (
            <div className="sidebar-admin" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <small
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "0 12px",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Branch Switcher
              </small>
              <Link
                href="/dashboard"
                className="nav-link"
                style={{ color: "#93c5fd" }}
              >
                <Wrench size={18} strokeWidth={1.5} aria-hidden="true" />
                <span>Workshop Bay</span>
                <ArrowUpRight size={14} style={{ marginLeft: "auto", opacity: 0.7 }} />
              </Link>
            </div>
          )}
        </div>

        <div className="side-bottom">
          <Link href="/account" className="row account-link">
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="account-copy">
              <strong>{user.name}</strong>
              <small>
                {user.role === Role.SHOP_STAFF
                  ? "Shop Staff"
                  : user.role === Role.ADMIN
                  ? "Administrator"
                  : "Finance"}
              </small>
            </div>
          </Link>
          <form action={logout}>
            <button className="btn btn-secondary btn-small mt" type="submit">
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <ShopPageLabel />
          <div className="row" style={{ alignItems: "center", gap: 12 }}>
            {isWorkshopManager && (
              <Link
                href="/dashboard"
                className="btn btn-secondary btn-small no-print"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.74rem",
                  padding: "4px 10px",
                }}
              >
                <Wrench size={13} />
                <span>Switch to Workshop</span>
              </Link>
            )}
            <Link href="/account" className="account-chip" aria-label="Account and password">
              <span className="account-name">{user.name}</span>
              <span className="avatar" aria-hidden="true">
                {initials}
              </span>
            </Link>
            <form action={logout} className="mobile-signout">
              <button type="submit" className="icon-button" aria-label="Sign out">
                <LogOut size={17} aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <ShopNavigation variant="mobile" label="Mobile shop navigation" />

        <div id="shop-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
