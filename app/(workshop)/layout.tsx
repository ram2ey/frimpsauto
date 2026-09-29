import Link from "next/link";
import { LogOut, Search, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { Role } from "@/generated/prisma/client";
import { BrandLogo } from "@/components/brand-logo";
import { WorkshopNavigation, WorkshopPageLabel, type WorkshopSection } from "@/components/workshop-navigation";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";

import { redirect } from "next/navigation";

export default async function WorkshopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === Role.SHOP_STAFF) redirect("/shop");

  const links: WorkshopSection[] = ["dashboard", "jobs", "customers", "inventory", "finance"];
  const visible = user.role === Role.TECHNICIAN ? links.slice(0, 2) : user.role === Role.SUPERVISOR ? links.slice(0, 4) : links;
  const administration: WorkshopSection[] = user.role === Role.ADMIN ? ["shop", "team", "checklists", "settings"] : [];
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("");

  return <div className="shell">
    <a className="skip-link" href="#workshop-content">Skip to content</a>
    <aside className="sidebar">
      <Link href="/dashboard" className="brand-link" aria-label="Frimps Auto dashboard"><BrandLogo priority /></Link>
      <form action="/jobs" className="sidebar-search" role="search">
        <label className="sr-only" htmlFor="workshop-search">Search jobs by customer, VIN or plate</label>
        <Search size={16} aria-hidden="true" />
        <input id="workshop-search" name="q" type="search" placeholder="Find a job…" />
        <button type="submit" aria-label="Search jobs"><ArrowUpRight size={16} aria-hidden="true" /></button>
      </form>
      <div className="sidebar-menu"><WorkshopNavigation items={visible} label="Main navigation" />
      {!!administration.length && <div className="sidebar-admin"><WorkshopNavigation items={administration} variant="utility" label="Administration" /></div>}</div>
      <div className="side-bottom">
        <Link href="/account" className="row account-link"><span className="avatar" aria-hidden="true">{initials}</span><div className="account-copy"><strong>{user.name}</strong><small>Account · Change password</small></div></Link>
        <form action={logout}><button className="btn btn-secondary btn-small mt" type="submit"><LogOut size={14} aria-hidden="true" /> Sign out</button></form>
      </div>
    </aside>
    <div className="main">
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <MobileNavDrawer
            user={user}
            portal="workshop"
            visibleSections={visible}
            adminSections={administration}
            logoutAction={logout}
          />
          <WorkshopPageLabel />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Link href="/account" className="account-chip" aria-label="Account and password"><span className="account-name">{user.name}</span><span className="avatar" aria-hidden="true">{initials}</span></Link>
          <form action={logout} className="mobile-signout"><button type="submit" className="icon-button" aria-label="Sign out"><LogOut size={17} aria-hidden="true" /></button></form>
        </div>
      </header>
      <div id="workshop-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}
