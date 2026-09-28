import Link from "next/link";
import { LogOut, Search, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { Role } from "@/generated/prisma/client";
import { BrandLogo } from "@/components/brand-logo";
import { WorkshopNavigation, WorkshopPageLabel, type WorkshopSection } from "@/components/workshop-navigation";

export default async function WorkshopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links: WorkshopSection[] = ["dashboard", "jobs", "customers", "inventory", "finance"];
  const visible = user.role === Role.TECHNICIAN ? links.slice(0, 2) : user.role === Role.SUPERVISOR ? links.slice(0, 4) : links;
  const administration: WorkshopSection[] = user.role === Role.ADMIN ? ["team", "checklists"] : [];
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("");

  return <div className="shell">
    <a className="skip-link" href="#workshop-content">Skip to content</a>
    <aside className="sidebar">
      <Link href="/dashboard" className="brand-link" aria-label="Frimps Auto dashboard"><BrandLogo /></Link>
      <form action="/jobs" className="sidebar-search" role="search">
        <label className="sr-only" htmlFor="workshop-search">Search jobs by customer, VIN or plate</label>
        <Search size={16} aria-hidden="true" />
        <input id="workshop-search" name="q" type="search" placeholder="Find a job…" />
        <button type="submit" aria-label="Search jobs"><ArrowUpRight size={16} aria-hidden="true" /></button>
      </form>
      <div><div className="nav-caption">Your workspace</div><WorkshopNavigation items={visible} label="Main navigation" /></div>
      {!!administration.length && <div className="sidebar-admin"><div className="nav-caption">Administration</div><WorkshopNavigation items={administration} variant="utility" label="Administration" /></div>}
      <div className="side-bottom">
        <div className="row"><span className="avatar" aria-hidden="true">{initials}</span><div className="account-copy"><strong>{user.name}</strong><small>{user.role.toLowerCase()}</small></div></div>
        <form action={logout}><button className="btn btn-secondary btn-small mt" type="submit"><LogOut size={14} aria-hidden="true" /> Sign out</button></form>
      </div>
    </aside>
    <div className="main">
      <header className="topbar">
        <WorkshopPageLabel />
        <div className="account-chip"><span className="pill">{user.role.toLowerCase()}</span><span className="account-name">{user.name}</span><span className="avatar" aria-hidden="true">{initials}</span></div>
        <form action={logout} className="mobile-signout"><button type="submit" className="icon-button" aria-label="Sign out"><LogOut size={17} aria-hidden="true" /></button></form>
      </header>
      <WorkshopNavigation items={[...visible, ...administration]} variant="mobile" label="Mobile navigation" />
      <div id="workshop-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}
