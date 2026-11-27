import { login } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";
import { InstallAppButton } from "@/components/install-app";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; wait?: string }> }) {
  const { error: code, wait } = await searchParams;
  const minutes = Math.min(15, Math.max(1, Number.parseInt(wait || "", 10) || 15));
  // Only fixed messages are shown, so a crafted link cannot put its own text on the sign-in page.
  const error = code === "invalid"
    ? "Invalid username or password."
    : code === "locked"
      ? `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
      : null;
  return <main className="login-wrap login-single">
    <section className="login-form"><div className="login-card">
      <BrandLogo className="auth-brand-logo" priority />
      <h1>Sign in</h1>
      {error && <div className="notice">{error}</div>}
      <form action={login} className="stack">
        <div><label htmlFor="username">Username</label><input id="username" name="username" required autoComplete="username" /></div>
        <div><label htmlFor="password">Password</label><PasswordInput id="password" name="password" required autoComplete="current-password" /></div>
        <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
      </form>
      <InstallAppButton className="install-app-login" />
    </div></section>
  </main>;
}
