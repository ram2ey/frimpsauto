import { login } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { temporaryPasswordResetEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const { error, reset } = await searchParams;
  return <main className="login-wrap login-single">
    <section className="login-form"><div className="login-card">
      <BrandLogo className="auth-brand-logo" priority />
      <h1>Sign in</h1>
      {reset === "1" && <div className="notice success" role="status">Password reset. Sign in with your new password.</div>}
      {error && <div className="notice">{error}</div>}
      <form action={login} className="stack">
        <div><label htmlFor="username">Username</label><input id="username" name="username" required autoComplete="username" /></div>
        <div><label htmlFor="password">Password</label><input id="password" type="password" name="password" required autoComplete="current-password" /></div>
        <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
      </form>
      {temporaryPasswordResetEnabled() && <p className="mt"><Link href="/forgot-password" className="text-link">Forgot password?</Link></p>}
    </div></section>
  </main>;
}
