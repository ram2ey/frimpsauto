import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LandingHeader } from "@/components/landing-header";
import { LandingHero } from "@/components/landing-hero";
import { LandingServices } from "@/components/landing-services";
import { LandingGallery } from "@/components/landing-gallery";
import { LandingLocation } from "@/components/landing-location";
import { LandingFooter } from "@/components/landing-footer";

export default async function Home() {
  const [user, profile] = await Promise.all([
    currentUser(),
    db.businessProfile.findUnique({ where: { id: "primary" } }).catch(() => null),
  ]);

  return (
    <div className="landing-page">
      <LandingHeader user={user} phone={profile?.phone} />
      <main id="main-content">
        <LandingHero phone={profile?.phone} />
        <LandingServices />
        <LandingGallery />
        <LandingLocation
          address={profile?.address}
          phone={profile?.phone}
          email={profile?.email}
        />
      </main>
      <LandingFooter />
    </div>
  );
}
