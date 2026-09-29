"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, Search, ArrowUpRight, LogOut, Wrench } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { WorkshopNavigation, type WorkshopSection } from "@/components/workshop-navigation";
import { ShopNavigation } from "@/components/shop-navigation";

interface MobileNavDrawerProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
  portal: "workshop" | "shop";
  visibleSections?: WorkshopSection[];
  adminSections?: WorkshopSection[];
  logoutAction: () => Promise<void>;
}

export function MobileNavDrawer({
  user,
  portal,
  visibleSections = [],
  adminSections = [],
  logoutAction,
}: MobileNavDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Automatically close drawer whenever user navigates to a new page
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  const isWorkshopManager = user.role === "ADMIN" || user.role === "FINANCE";

  return (
    <>
      {/* Mobile Hamburger Trigger Button in Topbar */}
      <button
        type="button"
        className="mobile-nav-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {/* Slide-out Drawer & Backdrop */}
      {isOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`mobile-drawer-panel${isOpen ? " is-open" : ""}`}
        aria-label="Mobile navigation drawer"
        aria-hidden={!isOpen}
      >
        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href={portal === "workshop" ? "/dashboard" : "/shop"}
              onClick={() => setIsOpen(false)}
              className="brand-link"
              style={{ width: 44, padding: 3 }}
            >
              <BrandLogo priority />
            </Link>
            <div>
              <strong style={{ display: "block", fontSize: "0.95rem", color: "#ffffff", lineHeight: 1.2 }}>
                Frimps Auto
              </strong>
              <small
                style={{
                  display: "inline-block",
                  fontSize: "0.68rem",
                  color: portal === "shop" ? "#c084fc" : "#38bdf8",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {portal === "shop" ? "Retail Parts Shop" : "Workshop Bay"}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Content */}
        <div
          className="mobile-drawer-body"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) {
              setIsOpen(false);
            }
          }}
        >
          {portal === "workshop" ? (
            <>
              {/* Job Search */}
              <form
                action="/jobs"
                className="sidebar-search"
                role="search"
                style={{ margin: "0 0 16px" }}
                onSubmit={() => setIsOpen(false)}
              >
                <label className="sr-only" htmlFor="mobile-workshop-search">
                  Search jobs by customer, VIN or plate
                </label>
                <Search size={16} aria-hidden="true" />
                <input id="mobile-workshop-search" name="q" type="search" placeholder="Find a job…" />
                <button type="submit" aria-label="Search jobs">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </form>

              {/* Main Navigation */}
              <div className="sidebar-menu">
                <WorkshopNavigation items={visibleSections} label="Mobile drawer navigation" />
                {!!adminSections.length && (
                  <div className="sidebar-admin">
                    <WorkshopNavigation
                      items={adminSections}
                      variant="utility"
                      label="Mobile drawer administration"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Retail Parts Shop Navigation */
            <div className="sidebar-menu">
              <ShopNavigation label="Mobile shop drawer navigation" />

              {isWorkshopManager && (
                <div
                  className="sidebar-admin"
                  style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
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
                    onClick={() => setIsOpen(false)}
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
          )}
        </div>

        {/* Drawer Footer (User & Logout) */}
        <div className="side-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "16px" }}>
          <Link
            href="/account"
            onClick={() => setIsOpen(false)}
            className="row account-link"
            style={{ padding: "8px 0" }}
          >
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="account-copy">
              <strong>{user.name}</strong>
              <small>Account · Change password</small>
            </div>
          </Link>

          <form action={logoutAction}>
            <button className="btn btn-secondary btn-small mt" type="submit" style={{ width: "100%" }}>
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
