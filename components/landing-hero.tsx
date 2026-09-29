import { MessageSquare, Wrench, MapPin } from "lucide-react";

interface LandingHeroProps {
  phone?: string | null;
}

export function LandingHero({ phone }: LandingHeroProps) {
  const cleanPhone = phone?.replace(/[^0-9]/g, "") || "233200000000";
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    "Hello Frimps MB Autoboss, I would like to book an inspection / service for my Mercedes-Benz."
  )}`;

  return (
    <section className="landing-hero">
      <div className="landing-container">
        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#38bdf8" }} />
            <span>Mercedes-Benz Specialist Workshop · Accra, Ghana</span>
          </div>

          <h1>Precision German Engineering &amp; Dealership-Grade Diagnostics</h1>

          <p className="landing-hero-lead">
            Accra&apos;s trusted center for Mercedes-Benz. Equipped with factory STAR &amp; XENTRY
            computerized diagnostics, certified master technicians, and 100% genuine OEM parts to keep
            your vehicle running to strict Stuttgart standards.
          </p>

          <div className="landing-hero-actions">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn landing-btn-whatsapp"
              style={{ padding: "12px 24px", fontSize: "0.95rem" }}
            >
              <MessageSquare size={18} aria-hidden="true" />
              <span>Book via WhatsApp</span>
            </a>

            <a
              href="#services"
              className="landing-btn landing-btn-secondary"
              style={{ padding: "12px 22px", fontSize: "0.95rem" }}
            >
              <Wrench size={16} aria-hidden="true" />
              <span>Explore Specialist Services</span>
            </a>

            <a
              href="#location"
              className="landing-btn landing-btn-outline"
              style={{ padding: "12px 18px", fontSize: "0.9rem" }}
            >
              <MapPin size={15} aria-hidden="true" />
              <span>Location &amp; Hours</span>
            </a>
          </div>

          {/* Key Proof Points */}
          <div className="landing-trust-bar">
            <div className="landing-trust-item">
              <div className="landing-trust-val accent">STAR &amp; XENTRY</div>
              <div className="landing-trust-label">Factory Diagnostic Telemetry</div>
            </div>
            <div className="landing-trust-item">
              <div className="landing-trust-val">15+ Years</div>
              <div className="landing-trust-label">Mercedes-Benz Specialization</div>
            </div>
            <div className="landing-trust-item">
              <div className="landing-trust-val accent">100% Genuine</div>
              <div className="landing-trust-label">OEM Parts &amp; Approved Fluids</div>
            </div>
            <div className="landing-trust-item">
              <div className="landing-trust-val">Same-Day</div>
              <div className="landing-trust-label">Service A &amp; Service B Turnaround</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
