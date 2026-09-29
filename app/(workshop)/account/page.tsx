import { changePassword, changeUsername } from "@/app/auth-actions";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string; changed?: string; updated?: string }> }) {
  const user = await requireUser();
  const { error, changed, updated } = await searchParams;
  return <main className="content"><div className="page-head"><div><h1>Account</h1><p className="subtitle">{user.name} · {user.role.toLowerCase()}</p></div></div>
    {error && <div className="notice">{error}</div>}
    {(changed === "1" || updated === "1") && <div className="notice success">{changed === "1" ? "Password changed." : "Username updated."}</div>}
    <div className="grid two"><section className="card"><h2>Change password</h2><form action={changePassword} className="stack">
      <div><label htmlFor="currentPassword">Current password</label><input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password"/></div>
      <div><label htmlFor="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" minLength={6} maxLength={72} required autoComplete="new-password"/></div>
      <div><label htmlFor="confirmPassword">Confirm new password</label><input id="confirmPassword" name="confirmPassword" type="password" minLength={6} maxLength={72} required autoComplete="new-password"/></div>
      <SubmitButton pendingLabel="Saving password..." style={{ alignSelf: "start" }}>Save password</SubmitButton>
    </form></section>
    <section className="card"><h2>Username</h2><form action={changeUsername} className="stack">
      <div><label htmlFor="username">Username</label><input id="username" name="username" defaultValue={user.username} minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" required autoComplete="username"/></div>
      <div><label htmlFor="usernamePassword">Current password</label><input id="usernamePassword" name="currentPassword" type="password" required autoComplete="current-password"/></div>
      <SubmitButton className="btn btn-secondary" pendingLabel="Saving username..." style={{ alignSelf: "start" }}>Save username</SubmitButton>
    </form></section></div>
  </main>;
}
