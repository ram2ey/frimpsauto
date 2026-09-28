import { login } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { SubmitButton } from "@/components/submit-button";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="login-wrap login-single">
    <section className="login-form"><div className="login-card">
      <BrandLogo className="auth-brand-logo" />
      <h1>Sign in</h1>
      {error && <div className="notice">{error}</div>}
      <form action={login} className="stack">
        <div><label htmlFor="username">Username</label><input id="username" name="username" required autoComplete="username" /></div>
        <div><label htmlFor="password">Password</label><input id="password" type="password" name="password" required autoComplete="current-password" /></div>
        <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
      </form>
    </div></section>
  </main>;
}
