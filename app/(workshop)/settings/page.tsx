import { Role } from "@/generated/prisma/client";
import { updateBusinessProfile } from "@/app/business-actions";
import { BrandLogo } from "@/components/brand-logo";
import { SubmitButton } from "@/components/submit-button";
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
        <div className="divider" />
        <div><h2 style={{ margin: 0 }}>Payment details</h2><p className="muted" style={{ margin: "4px 0 0", fontSize: "0.8rem" }}>Shown on invoices with a balance due, on screen, when printed and in the PDF. Leave a section blank to hide it.</p></div>
        <div className="form-grid"><div><label htmlFor="bank-name">Bank</label><input id="bank-name" name="bankName" maxLength={80} defaultValue={profile?.bankName || ""} placeholder="e.g. Ecobank"/></div><div><label htmlFor="bank-branch">Branch (optional)</label><input id="bank-branch" name="bankBranch" maxLength={80} defaultValue={profile?.bankBranch || ""}/></div></div>
        <div className="form-grid"><div><label htmlFor="bank-account-name">Account name</label><input id="bank-account-name" name="bankAccountName" maxLength={120} defaultValue={profile?.bankAccountName || ""}/></div><div><label htmlFor="bank-account-number">Account number</label><input id="bank-account-number" name="bankAccountNumber" maxLength={40} inputMode="numeric" defaultValue={profile?.bankAccountNumber || ""}/></div></div>
        <div className="form-grid"><div><label htmlFor="momo-number">MTN MoMo number</label><input id="momo-number" name="momoNumber" type="tel" maxLength={30} defaultValue={profile?.momoNumber || ""}/></div><div><label htmlFor="momo-name">MoMo account name</label><input id="momo-name" name="momoName" maxLength={120} defaultValue={profile?.momoName || ""}/></div></div>
        <SubmitButton pendingLabel="Saving details..." style={{ alignSelf: "start" }}>Save details</SubmitButton>
      </form>
    </section>
  </main>;
}
