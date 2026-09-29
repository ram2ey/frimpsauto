import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <div>
          <strong className="landing-footer-brand">Frimps MB Autoboss</strong>
          <p className="landing-footer-copy">&copy; {new Date().getFullYear()} Frimps MB Autoboss · Accra, Ghana</p>
        </div>
        <div className="landing-footer-links">
          <a href="#services" className="landing-footer-link">Services</a>
          <a href="#workshop" className="landing-footer-link">Why us</a>
          <a href="#location" className="landing-footer-link">Contact &amp; hours</a>
          <Link href="/login" className="landing-footer-link">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}
