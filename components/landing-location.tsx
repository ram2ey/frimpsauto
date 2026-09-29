import { Clock, MapPin, Phone, Mail, MessageSquare, ArrowUpRight } from "lucide-react";

interface LandingLocationProps {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export function LandingLocation({ address, phone, email }: LandingLocationProps) {
  const displayAddress = address || "Anyah NIC, Accra";
  const displayPhone = phone || "+233543263981";
  const displayEmail = email || "service@frimpsmbautoboss.com";
  const cleanPhone = displayPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    "Hello Frimps MB Autoboss, I would like to contact the workshop."
  )}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Frimps Auto Mercedes-Benz ${displayAddress}`)}`;

  return (
    <section id="location" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head">
          <h2>Visit or get in touch</h2>
        </div>
        <div className="landing-location-grid">
          <div className="landing-location-card">
            <Clock className="landing-card-icon" size={28} strokeWidth={1.6} aria-hidden="true" />
            <h3>Opening hours</h3>
            <ul className="landing-hours-list">
              <li className="landing-hours-item"><span>Monday – Friday</span><strong>8:00 AM – 6:00 PM</strong></li>
              <li className="landing-hours-item"><span>Saturday</span><strong>8:30 AM – 4:00 PM</strong></li>
              <li className="landing-hours-item"><span>Sunday</span><strong>Closed</strong></li>
            </ul>
          </div>
          <div className="landing-location-card" id="contact">
            <MapPin className="landing-card-icon" size={28} strokeWidth={1.6} aria-hidden="true" />
            <h3>Contact the workshop</h3>
            <div className="landing-contact-list">
              <div className="landing-contact-item"><MapPin size={18} aria-hidden="true" /><div><strong>Address</strong><span>{displayAddress}</span><a href={mapsUrl} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={14} aria-hidden="true" /></a></div></div>
              <div className="landing-contact-item"><Phone size={18} aria-hidden="true" /><div><strong>Phone</strong><a href={`tel:${cleanPhone}`}>{displayPhone}</a></div></div>
              <div className="landing-contact-item"><Mail size={18} aria-hidden="true" /><div><strong>Email</strong><a href={`mailto:${displayEmail}`}>{displayEmail}</a></div></div>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-whatsapp landing-contact-button">
              <MessageSquare size={18} aria-hidden="true" /> Message us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
