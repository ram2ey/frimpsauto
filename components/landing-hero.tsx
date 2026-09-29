import { MessageSquare, ArrowUpRight } from "lucide-react";

interface LandingHeroProps {
  phone?: string | null;
}

export function LandingHero({ phone }: LandingHeroProps) {
  const cleanPhone = phone?.replace(/[^0-9]/g, "") || "233543026391";
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    "Hello Frimps MB Autoboss, I would like to book a service for my Mercedes-Benz."
  )}`;

  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="landing-container landing-hero-inner">
        <div className="landing-hero-content">
          <p className="landing-hero-kicker">Mercedes-Benz specialists in Accra</p>
          <h1 id="landing-hero-title">Expert care for every mile.</h1>
          <p className="landing-hero-lead">
            Diagnostics, servicing and repairs for your Mercedes-Benz, all in one place.
          </p>
          <div className="landing-hero-actions">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-whatsapp">
              <MessageSquare size={18} aria-hidden="true" />
              <span>Book on WhatsApp</span>
            </a>
            <a href="#services" className="landing-btn landing-btn-hero-link">
              <span>Explore services</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
