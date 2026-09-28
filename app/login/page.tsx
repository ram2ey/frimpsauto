import { login } from "@/app/auth-actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="login-wrap">
    <section className="login-art">
      <div className="brand">Frimps <span>Auto</span></div>
      <div><div className="eyebrow" style={{ color: "#aebfce" }}>Workshop management</div><h1>Precision in every service.</h1><p style={{ color: "#b9c8d6" }}>One place for every job, part, inspection and invoice.</p></div>
      <p style={{ color: "#91a2b3", fontSize: ".8rem" }}>Mercedes-Benz specialist workshop</p>
    </section>
    <section className="login-form"><div className="login-card">
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
