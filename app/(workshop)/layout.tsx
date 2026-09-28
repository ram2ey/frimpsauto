import Link from "next/link";
import { LayoutDashboard, ClipboardList, UsersRound, Package, ReceiptText, UserCog, ListChecks, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { Role } from "@/generated/prisma/client";
import { BrandLogo } from "@/components/brand-logo";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/jobs", label: "Job orders", icon: ClipboardList },
  { href: "/customers", label: "Customers", icon: UsersRound },
  { href: "/inventory", label: "Parts inventory", icon: Package },
  { href: "/finance", label: "Finance", icon: ReceiptText },
];

export default async function WorkshopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const visible = user.role === Role.TECHNICIAN ? links.slice(0, 2) : user.role === Role.SUPERVISOR ? links.slice(0, 4) : links;
  return <div className="shell">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand-link" aria-label="Frimps Auto dashboard"><BrandLogo /></Link>
      <nav className="nav-group" aria-label="Main navigation"><div className="nav-caption">Workshop</div>{visible.map(item => <Link className="nav-link" href={item.href} key={item.href}><item.icon size={18} strokeWidth={1.8}/>{item.label}</Link>)}</nav>
      {user.role === Role.ADMIN && <nav className="nav-group" aria-label="Administration"><div className="nav-caption">Administration</div><Link className="nav-link" href="/team"><UserCog size={18}/>Staff & access</Link><Link className="nav-link" href="/checklists"><ListChecks size={18}/>Checklists</Link></nav>}
      <div className="side-bottom"><strong>{user.name}</strong><small>{user.role.toLowerCase()}</small><form action={logout}><button className="btn btn-secondary btn-small mt" type="submit"><LogOut size={14}/> Sign out</button></form></div>
    </aside>
    <div className="main"><header className="topbar"><div className="crumb">Frimps Auto / Workshop</div><div className="row"><span className="pill">{user.role.toLowerCase()}</span><strong style={{ fontSize: ".85rem" }}>{user.name}</strong></div></header><nav className="mobile-nav" aria-label="Mobile navigation">{visible.map(item => <Link href={item.href} key={item.href}>{item.label}</Link>)}{user.role === Role.ADMIN && <><Link href="/team">Staff</Link><Link href="/checklists">Checklists</Link></>}</nav>{children}</div>
  </div>;
}
