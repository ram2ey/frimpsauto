import { CheckCircle2, Shield, Wrench } from "lucide-react";

const highlights = [
  { icon: Wrench, title: "Focused expertise", description: "A workshop dedicated to Mercedes-Benz vehicles." },
  { icon: Shield, title: "Quality parts", description: "Parts selected for the vehicle and the job." },
  { icon: CheckCircle2, title: "Clear communication", description: "Understand the work before it begins." },
];

export function LandingGallery() {
  return (
    <section id="workshop" className="landing-section landing-section-tinted">
      <div className="landing-container">
        <div className="landing-section-head">
          <h2>Care you can count on</h2>
        </div>
        <div className="landing-credentials-grid">
          {highlights.map((highlight) => (
            <article key={highlight.title} className="landing-credential-card">
              <highlight.icon size={28} strokeWidth={1.6} aria-hidden="true" />
              <h3>{highlight.title}</h3>
              <p>{highlight.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
