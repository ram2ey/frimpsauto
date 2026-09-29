import { CheckCircle2, Shield, Wrench, FileText } from "lucide-react";

export function LandingGallery() {
  const credentials = [
    {
      icon: Shield,
      title: "100% Genuine Parts Guarantee",
      desc: "We strictly install OEM and genuine German-manufactured Mercedes-Benz parts. Zero counterfeit compromises.",
    },
    {
      icon: Wrench,
      title: "Diagnostic Precision Over Guesswork",
      desc: "Every repair is guided by live XENTRY / STAR fault codes and guided tests. We identify the exact root cause first.",
    },
    {
      icon: FileText,
      title: "Transparent Itemized Invoicing",
      desc: "Full transparency on all labor operations and part prices before and after service. No hidden fees.",
    },
    {
      icon: CheckCircle2,
      title: "Comprehensive Safety Sign-Off",
      desc: "Rigorous 10-point checklist inspection covering brakes, suspension, fluids, lights, and diagnostics before delivery.",
    },
  ];

  return (
    <section id="workshop" className="landing-section" style={{ background: "rgba(17, 22, 34, 0.4)" }}>
      <div className="landing-container">
        <div className="landing-section-head">
          <div className="landing-eyebrow">Facility &amp; Standards</div>
          <h2>Our Workshop &amp; Quality Promise</h2>
          <p>
            Experience a workshop designed from the ground up for luxury vehicle care. Clean bays,
            specialized Mercedes-Benz diagnostic hardware, and master technicians who treat your vehicle
            with absolute care.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 44,
          }}
        >
          <div
            style={{
              background: "#111622",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "24px",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Bays &amp; Lifts
            </div>
            <h4 style={{ color: "#ffffff", fontSize: "1.1rem", margin: "0 0 8px" }}>
              Dedicated Service Bays
            </h4>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.55, margin: 0 }}>
              Heavy-duty hydraulic lifts capable of safely handling everything from low-slung AMG coupes to armored G-Wagons and Mercedes Sprinters.
            </p>
          </div>

          <div
            style={{
              background: "#111622",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "24px",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Diagnostics Hub
            </div>
            <h4 style={{ color: "#ffffff", fontSize: "1.1rem", margin: "0 0 8px" }}>
              STAR &amp; XENTRY Systems
            </h4>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.55, margin: 0 }}>
              Direct factory multiplexer interfaces connecting to your Mercedes-Benz onboard ECUs for live telemetry, coding, and adaptation resets.
            </p>
          </div>

          <div
            style={{
              background: "#111622",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "24px",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Parts Store
            </div>
            <h4 style={{ color: "#ffffff", fontSize: "1.1rem", margin: "0 0 8px" }}>
              In-Stock Genuine Shelf Inventory
            </h4>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.55, margin: 0 }}>
              Fully stocked on-site parts department holding OEM brake pads, sensors, filters, spark plugs, and factory synthetic engine oils.
            </p>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="landing-credentials-grid">
          {credentials.map((cred, idx) => (
            <div key={idx} className="landing-credential-card">
              <div style={{ color: "#38bdf8", display: "inline-flex" }}>
                <cred.icon size={24} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h4>{cred.title}</h4>
              <p>{cred.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
