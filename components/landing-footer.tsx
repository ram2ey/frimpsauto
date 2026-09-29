import Link from "next/link";
import { LogIn } from "lucide-react";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="landing-footer-inner">
          <div>
            <strong style={{ color: "#ffffff", fontSize: "0.95rem", display: "block" }}>
              Frimps MB Autoboss
            </strong>
            <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
              Independent Mercedes-Benz Specialist Workshop &amp; Genuine Parts · Accra, Ghana
            </span>
            <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#475569" }}>
              &copy; {currentYear} Frimps MB Autoboss. All rights reserved.
            </p>
          </div>

          <div className="landing-footer-links">
            <a href="#services" className="landing-footer-link">
              Services
            </a>
            <a href="#workshop" className="landing-footer-link">
              Facility
            </a>
            <a href="#reviews" className="landing-footer-link">
              Testimonials
            </a>
            <a href="#location" className="landing-footer-link">
              Hours &amp; Location
            </a>
            <Link
              href="/login"
              className="landing-footer-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "#38bdf8",
              }}
            >
              <LogIn size={12} />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
