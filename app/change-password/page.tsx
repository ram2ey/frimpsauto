import { redirect } from "next/navigation";
import { changePassword, logout } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { currentUser } from "@/lib/auth";

export default async function FirstPasswordChange({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/dashboard");
  const { error } = await searchParams;
  return <main className="login-wrap login-single"><section className="login-form"><div className="login-card">
    <BrandLogo className="auth-brand-logo" />
    <h1>Change your password</h1><p className="subtitle mb">{user.name}, choose a new password before continuing.</p>
    {error && <div className="notice">{error}</div>}
    <form action={changePassword} className="stack">
      <div><label htmlFor="currentPassword">Temporary password</label><input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password"/></div>
      <div><label htmlFor="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" minLength={12} maxLength={72} required autoComplete="new-password"/></div>
      <div><label htmlFor="confirmPassword">Confirm new password</label><input id="confirmPassword" name="confirmPassword" type="password" minLength={12} maxLength={72} required autoComplete="new-password"/></div>
      <button className="btn btn-primary">Save password</button>
    </form>
    <form action={logout} className="mt"><button className="btn btn-secondary">Sign out</button></form>
  </div></section></main>;
}
