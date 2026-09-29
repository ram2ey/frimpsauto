import { Cpu, CalendarCheck, Cog, Activity, ShieldCheck, Zap } from "lucide-react";

const services = [
  { icon: Cpu, title: "Diagnostics", description: "Find the cause of warning lights and electrical faults with specialist diagnostic tools." },
  { icon: CalendarCheck, title: "Routine servicing", description: "Keep your Mercedes-Benz on schedule with Service A and Service B maintenance." },
  { icon: Cog, title: "Transmission", description: "Fluid changes, fault diagnosis and repairs for automatic gearboxes." },
  { icon: Activity, title: "Suspension", description: "Inspection and repair of AIRMATIC and other suspension systems." },
  { icon: ShieldCheck, title: "Brakes", description: "Brake inspections, component replacement and system diagnostics." },
  { icon: Zap, title: "Electrical & AC", description: "Troubleshooting for batteries, modules and air conditioning." },
];

export function LandingServices() {
  return (
    <section id="services" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head">
          <h2>Services for your Mercedes-Benz</h2>
        </div>
        <div className="landing-services-grid">
          {services.map((service) => (
            <article key={service.title} className="landing-service-card">
              <div className="landing-service-icon">
                <service.icon size={24} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
