import {
  Cpu,
  CalendarCheck,
  Cog,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function LandingServices() {
  const services = [
    {
      icon: Cpu,
      title: "STAR & XENTRY Diagnostics",
      description:
        "Factory-level computerized deep scanning, live telemetry analysis, SAM module coding, adaptation resets, and resolving stubborn check engine & warning lights with zero guesswork.",
      models: "W204, W205, W206, W212, W213, W222, W463 G-Class, GLE, GLC, CLA",
    },
    {
      icon: CalendarCheck,
      title: "Assyst Service A & Service B",
      description:
        "Comprehensive scheduled maintenance strictly following Mercedes-Benz factory intervals. Genuine MB-Approved 229.5 synthetic lubricants, OEM fleece filters, and multi-point safety inspections.",
      models: "All Mercedes-Benz Passenger & Commercial Vehicles",
    },
    {
      icon: Cog,
      title: "7G & 9G-Tronic Transmissions",
      description:
        "Transmission fluid & filter flushes, conductor plate diagnostic repairs, valve body overhauls, adaptation recalibrations, and eliminating harsh shifting or gear slips.",
      models: "722.6, 722.9 7G-Tronic & 9G-Tronic Automatic Gearboxes",
    },
    {
      icon: Activity,
      title: "AIRMATIC & ABC Suspension",
      description:
        "Specialized servicing for air suspension and Active Body Control (ABC). Air strut replacements, compressor repairs, valve block leak fixes, and computer-guided ride height leveling.",
      models: "S-Class, E-Class, CLS, GLE, GLS, ML, R-Class",
    },
    {
      icon: ShieldCheck,
      title: "Braking Systems & SBC / ESP",
      description:
        "Genuine Mercedes-Benz ceramic & ventilated rotor replacements, Sensotronic Brake Control (SBC) diagnostics, electronic fluid pressure bleeding, and ESP sensor calibration.",
      models: "AMG High Performance & Standard Mercedes Brake Systems",
    },
    {
      icon: Zap,
      title: "Electrical, AC & SAM Modules",
      description:
        "Front & rear SAM module programming, parasitic battery drain diagnosis, OEM alternator replacements, high-cranking AGM batteries, and precision AC compressor overhauls.",
      models: "Full Mercedes-Benz CAN-Bus & Electrical Networks",
    },
  ];

  return (
    <section id="services" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head">
          <div className="landing-eyebrow">Expertise &amp; Capabilities</div>
          <h2>Specialized Mercedes-Benz Services</h2>
          <p>
            Unlike general mechanic shops, our technicians, tooling, and diagnostic hardware are dedicated
            exclusively to the engineering standards of Mercedes-Benz vehicles.
          </p>
        </div>

        <div className="landing-services-grid">
          {services.map((srv, idx) => (
            <div key={idx} className="landing-service-card">
              <div className="landing-service-icon">
                <srv.icon size={22} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3>{srv.title}</h3>
              <p>{srv.description}</p>
              <div className="landing-service-models">
                <strong>Chassis &amp; Platforms:</strong> {srv.models}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
