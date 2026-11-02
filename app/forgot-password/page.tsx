import Link from "next/link";
import { redirect } from "next/navigation";
import { resetForgottenPassword } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { SubmitButton } from "@/components/submit-button";
import { temporaryPasswordResetEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!temporaryPasswordResetEnabled()) redirect("/login");
  const { error } = await searchParams;
  return <main className="login-wrap login-single">
    <section className="login-form"><div className="login-card">
      <BrandLogo className="auth-brand-logo" priority />
      <h1>Reset password</h1>
      <p className="subtitle mb">Enter your account username and choose a new password.</p>
      {error && <div className="notice" role="alert">{error}</div>}
      <form action={resetForgottenPassword} className="stack">
        <div><label htmlFor="username">Username</label><input id="username" name="username" required autoComplete="username" /></div>
        <div><label htmlFor="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" minLength={6} maxLength={72} required autoComplete="new-password" /><small className="muted">At least 6 characters, up to 72 bytes.</small></div>
        <SubmitButton pendingLabel="Resetting password...">Reset password</SubmitButton>
      </form>
      <p className="mt"><Link href="/login" className="text-link">Back to sign in</Link></p>
    </div></section>
  </main>;
}
