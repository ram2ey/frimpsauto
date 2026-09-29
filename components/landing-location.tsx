import {
  Clock,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

interface LandingLocationProps {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export function LandingLocation({ address, phone, email }: LandingLocationProps) {
  const displayAddress = address || "Accra, Greater Accra Region, Ghana";
  const displayPhone = phone || "+233 20 000 0000";
  const displayEmail = email || "service@frimpsmbautoboss.com";

  const cleanPhone = displayPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    "Hello Frimps MB Autoboss, I need workshop assistance / directions for my Mercedes-Benz."
  )}`;

  const mapsQuery = encodeURIComponent(`Frimps Auto Mercedes-Benz ${displayAddress}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const schedule = [
    { day: "Monday – Friday", hours: "8:00 AM – 6:00 PM", status: "Full Service & Diagnostics" },
    { day: "Saturday", hours: "8:30 AM – 4:00 PM", status: "Quick Service & Intake" },
    { day: "Sunday", hours: "Closed", status: "Emergency Hotline Only", isClosed: true },
  ];

  return (
    <section id="location" className="landing-section" style={{ background: "rgba(17, 22, 34, 0.4)" }}>
      <div className="landing-container">
        <div className="landing-section-head">
          <div className="landing-eyebrow">Visit &amp; Connect</div>
          <h2>Location, Working Hours &amp; Contact</h2>
          <p>
            Conveniently situated in Accra to service luxury Mercedes-Benz vehicles. Walk in for diagnostics,
            genuine parts, or reach our emergency service desk directly.
          </p>
        </div>

        <div className="landing-location-grid">
          {/* Working Hours Card */}
          <div className="landing-location-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(14, 165, 233, 0.12)",
                  color: "#38bdf8",
                  borderRadius: 6,
                }}
              >
                <Clock size={19} aria-hidden="true" />
              </div>
              <h3 style={{ margin: 0 }}>Operating Hours</h3>
            </div>

            <ul className="landing-hours-list">
              {schedule.map((item, idx) => (
                <li key={idx} className="landing-hours-item">
                  <div>
                    <span className="landing-hours-day">{item.day}</span>
                    <small style={{ display: "block", fontSize: "0.7rem", color: "#64748b" }}>
                      {item.status}
                    </small>
                  </div>
                  <span className={`landing-hours-time${item.isClosed ? " closed" : ""}`}>
                    {item.hours}
                  </span>
                </li>
              ))}
            </ul>

            <div
              style={{
                marginTop: 24,
                padding: "14px 16px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: "#fbbf24", fontSize: "0.82rem", display: "block" }}>
                  24/7 Emergency Breakdown Assistance
                </strong>
                <p style={{ margin: "2px 0 0", color: "#d97706", fontSize: "0.76rem", lineHeight: 1.45 }}>
                  Experienced a sudden mechanical failure or flat-bed towing need in Accra? Reach our
                  standby emergency service team via WhatsApp or telephone.
                </p>
              </div>
            </div>
          </div>

          {/* Contact & Address Card */}
          <div className="landing-location-card" id="contact">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(14, 165, 233, 0.12)",
                  color: "#38bdf8",
                  borderRadius: 6,
                }}
              >
                <MapPin size={19} aria-hidden="true" />
              </div>
              <h3 style={{ margin: 0 }}>Workshop &amp; Inquiries</h3>
            </div>

            <div className="landing-contact-list">
              <div className="landing-contact-item">
                <div className="landing-contact-icon">
                  <MapPin size={18} />
                </div>
                <div className="landing-contact-text">
                  <strong>Workshop Address</strong>
                  <span>{displayAddress}</span>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.76rem", color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4 }}
                  >
                    <span>Get Directions on Google Maps</span>
                    <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>

              <div className="landing-contact-item">
                <div className="landing-contact-icon">
                  <Phone size={18} />
                </div>
                <div className="landing-contact-text">
                  <strong>Telephone Desk</strong>
                  <a href={`tel:${cleanPhone}`}>{displayPhone}</a>
                </div>
              </div>

              <div className="landing-contact-item">
                <div className="landing-contact-icon">
                  <Mail size={18} />
                </div>
                <div className="landing-contact-text">
                  <strong>Official Email</strong>
                  <a href={`mailto:${displayEmail}`}>{displayEmail}</a>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-btn landing-btn-whatsapp"
                style={{ flex: 1, minWidth: 160 }}
              >
                <MessageSquare size={16} />
                <span>Instant WhatsApp</span>
              </a>
              <a
                href={`tel:${cleanPhone}`}
                className="landing-btn landing-btn-primary"
                style={{ flex: 1, minWidth: 140 }}
              >
                <Phone size={16} />
                <span>Call Workshop</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
