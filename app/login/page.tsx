import { login } from "@/app/auth-actions";
import { BrandLogo } from "@/components/brand-logo";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="login-wrap login-single">
    <section className="login-form"><div className="login-card">
      <BrandLogo className="auth-brand-logo" />
      <div className="eyebrow">Staff sign in</div><h1>Welcome back</h1><p className="subtitle mb">Enter your staff credentials to continue.</p>
      {error && <div className="notice">{error}</div>}
      <form action={login} className="stack">
        <div><label htmlFor="email">Email address</label><input id="email" type="email" name="email" required autoComplete="username" /></div>
        <div><label htmlFor="password">Password</label><input id="password" type="password" name="password" required autoComplete="current-password" /></div>
        <button className="btn btn-primary" type="submit">Sign in</button>
      </form>
    </div></section>
  </main>;
}
