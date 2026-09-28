import { acceptInvite } from "@/app/auth-actions";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import Link from "next/link";

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  const valid = invite && !invite.usedAt && invite.expiresAt > new Date() && invite.user.active;
  return <main className="login-wrap"><section className="login-art"><div className="brand">Frimps Auto</div><div><h1>Join the workshop.</h1><p>Set up your staff account.</p></div></section><section className="login-form"><div className="login-card">
    {valid ? <><div className="eyebrow">Staff invitation</div><h1>Hello, {invite.user.name}</h1><p className="subtitle mb">Create a password for your {invite.user.role.toLowerCase()} account.</p>{error && <div className="notice">{error}</div>}<form action={acceptInvite.bind(null, token)} className="stack"><div><label htmlFor="password">Password (12 characters minimum)</label><input id="password" type="password" name="password" minLength={12} required autoComplete="new-password" /></div><button className="btn btn-primary">Activate account</button></form></> : <><h1>Invitation unavailable</h1><p className="subtitle">This link has expired or was already used. Ask an administrator for a new invitation.</p><Link className="btn btn-secondary mt" href="/login">Back to sign in</Link></>}
  </div></section></main>;
}
