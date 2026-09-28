import { Role } from "@/generated/prisma/client";
import { updateBusinessProfile } from "@/app/business-actions";
import { BrandLogo } from "@/components/brand-logo";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function BusinessSettings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireRole([Role.ADMIN]);
  const { saved } = await searchParams;
  const profile = await db.businessProfile.findUnique({ where: { id: "primary" } });
  return <main className="content"><div className="page-head"><h1>Business details</h1>{saved === "1" && <span className="pill paid">Saved</span>}</div>
    <section className="card" style={{ maxWidth: 750 }}><div className="section-title"><h2>Invoice details</h2><BrandLogo className="settings-logo" /></div>
      <form action={updateBusinessProfile} className="stack">
        <div><label htmlFor="business-name">Business name</label><input id="business-name" name="name" required maxLength={80} defaultValue={profile?.name || "Frimps MB Autoboss"}/></div>
        <div><label htmlFor="business-address">Address</label><input id="business-address" name="address" maxLength={160} defaultValue={profile?.address || ""}/></div>
        <div className="form-grid"><div><label htmlFor="business-phone">Phone</label><input id="business-phone" name="phone" type="tel" maxLength={50} defaultValue={profile?.phone || ""}/></div><div><label htmlFor="business-email">Email</label><input id="business-email" name="email" type="email" maxLength={100} defaultValue={profile?.email || ""}/></div></div>
        <button className="btn btn-primary" style={{ alignSelf: "start" }}>Save details</button>
      </form>
    </section>
  </main>;
}
