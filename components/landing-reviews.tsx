import { Star } from "lucide-react";

export function LandingReviews() {
  const reviews = [
    {
      name: "Kwesi Annan",
      model: "Mercedes-Benz E300 (W213)",
      location: "East Legon",
      rating: 5,
      quote:
        "Saved me thousands on an electrical glitch that two other garages in Accra couldn't figure out. Their STAR diagnostic diagnosed the rear SAM module within 30 minutes. The car drives like it just left the showroom.",
    },
    {
      name: "Nana Ama Osei",
      model: "Mercedes-Benz GLC 300 4MATIC",
      location: "Cantonments",
      rating: 5,
      quote:
        "Brought my GLC for scheduled Service B and front ceramic brake pads. The turnaround was quick, genuine OEM filters were used, and the invoice was completely itemized. Very professional reception and clean workshop.",
    },
    {
      name: "Dr. David Mensah",
      model: "Mercedes-Benz S550 (W222)",
      location: "Airport Residential",
      rating: 5,
      quote:
        "My right AIRMATIC strut started dropping overnight. Frimps diagnosed a faulty valve block and recalibrated the ride height without needing a needlessly expensive full strut replacement. Genuinely honest Mercedes specialists.",
    },
    {
      name: "Kofi Boateng",
      model: "Mercedes-AMG G63",
      location: "Ridge",
      rating: 5,
      quote:
        "Top-tier servicing for high-performance Mercedes engines. They use official MB-Approval synthetic oils, understand AMG cooling requirements, and treat customer vehicles with absolute care and respect.",
    },
  ];

  return (
    <section id="reviews" className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head">
          <div className="landing-eyebrow">Client Testimonials</div>
          <h2>Trusted by Mercedes Owners in Accra</h2>
          <p>
            Read what luxury car owners and daily drivers across Greater Accra have to say about our
            specialized workmanship, transparency, and diagnostic accuracy.
          </p>
        </div>

        <div className="landing-reviews-grid">
          {reviews.map((rev, idx) => (
            <div key={idx} className="landing-review-card">
              <div className="landing-stars">
                {[...Array(rev.rating)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
                ))}
              </div>

              <blockquote className="landing-review-quote">
                &ldquo;{rev.quote}&rdquo;
              </blockquote>

              <div className="landing-review-author">
                <div>
                  <div className="landing-author-name">{rev.name}</div>
                  <span className="landing-author-model">{rev.model}</span>
                </div>
                <span className="landing-author-loc">{rev.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
