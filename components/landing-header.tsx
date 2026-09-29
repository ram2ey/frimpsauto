import Link from "next/link";
import Image from "next/image";
import { MessageSquare, LogIn, ArrowRight } from "lucide-react";
import { Role, User } from "@/generated/prisma/client";

interface LandingHeaderProps {
  user: User | null;
  phone?: string | null;
}

export function LandingHeader({ user, phone }: LandingHeaderProps) {
  const cleanPhone = phone?.replace(/[^0-9]/g, "") || "233543263981";
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    "Hello Frimps MB Autoboss, I would like to inquire about a service for my Mercedes-Benz."
  )}`;

  const dashboardHref =
    user?.role === Role.SHOP_STAFF ? "/shop" : "/dashboard";

  return (
    <header className="landing-header">
      <div className="landing-container">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            <Image
              src="/frimps-logo.jpeg"
              alt="Frimps MB Autoboss"
              width={42}
              height={42}
              className="landing-brand-logo"
            />
            <div className="landing-brand-text">
              <strong>Frimps MB Autoboss</strong>
              <small>Mercedes-Benz Specialist</small>
            </div>
          </Link>

          <nav aria-label="Main Website Navigation">
            <ul className="landing-nav-links">
              <li>
                <a href="#services" className="landing-nav-link">
                  Services
                </a>
              </li>
              <li>
                <a href="#workshop" className="landing-nav-link">
                  Why us
                </a>
              </li>
              <li>
                <a href="#location" className="landing-nav-link">
                  Contact &amp; hours
                </a>
              </li>
            </ul>
          </nav>

          <div className="landing-header-actions">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn landing-btn-whatsapp"
              title="Chat with our service desk on WhatsApp"
            >
              <MessageSquare size={16} aria-hidden="true" />
              <span>WhatsApp Us</span>
            </a>

            {user ? (
              <Link
                href={dashboardHref}
                className="landing-btn landing-btn-primary"
                title="Enter your staff workspace"
              >
                <span>Dashboard</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="landing-btn landing-btn-outline"
                title="Staff & technician login"
              >
                <LogIn size={13} aria-hidden="true" />
                <span>Staff Portal</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
