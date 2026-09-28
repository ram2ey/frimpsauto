import { Role } from "@/generated/prisma/client";
import { createStaff, setStaffActive, setStaffPassword } from "@/app/auth-actions";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";

export default async function Team({ searchParams }: { searchParams: Promise<{ created?: string; reset?: string; error?: string }> }) {
  const actor = await requireRole([Role.ADMIN]);
  const { created, reset, error } = await searchParams;
  const staff = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  return <main className="content"><div className="page-head"><h1>Staff & access</h1></div>
    {error && <div className="notice">{error}</div>}
    {(created === "1" || reset === "1") && <div className="notice success">{created === "1" ? "Staff account created." : "Temporary password set. Other sessions were signed out."}</div>}
    <div className="grid two"><section className="card"><h2>Staff accounts</h2><div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Joined</th><th>Access</th></tr></thead><tbody>{staff.map(member => <tr key={member.id}>
      <td><strong>{member.name}</strong></td><td>{member.username}</td><td>{member.role.toLowerCase()}</td>
      <td><span className={`pill ${member.active ? "approved" : "rejected"}`}>{!member.active ? "Disabled" : !member.passwordHash ? "Needs password" : member.mustChangePassword ? "Change required" : "Active"}</span></td>
      <td>{date(member.createdAt)}</td>
      <td>{member.id !== actor.id && <div className="stack" style={{ gap: 8 }}><form action={setStaffActive.bind(null, member.id)}><input type="hidden" name="active" value={member.active ? "false" : "true"}/><button className="btn btn-secondary btn-small">{member.active ? "Disable" : "Enable"}</button></form><form action={setStaffPassword.bind(null, member.id)} className="staff-password-form"><label className="sr-only" htmlFor={`password-${member.id}`}>Temporary password for {member.name}</label><input id={`password-${member.id}`} name="password" type="password" minLength={12} required autoComplete="new-password" placeholder="Temporary password"/><button className="btn btn-secondary btn-small">Set password</button></form></div>}</td>
    </tr>)}</tbody></table></div></section>
    <section className="card"><h2>Create staff account</h2><form action={createStaff} className="stack">
      <div><label htmlFor="name">Full name</label><input id="name" name="name" maxLength={100} required/></div>
      <div><label htmlFor="username">Username</label><input id="username" name="username" minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" autoComplete="off" required/></div>
      <div><label htmlFor="password">Temporary password</label><input id="password" name="password" type="password" minLength={12} autoComplete="new-password" required/></div>
      <div><label htmlFor="role">Role</label><select id="role" name="role" required><option value="SUPERVISOR">Supervisor</option><option value="TECHNICIAN">Technician</option><option value="FINANCE">Finance</option><option value="ADMIN">Admin</option></select></div>
      <button className="btn btn-primary" style={{ alignSelf: "start" }}>Create user</button>
    </form></section></div>
  </main>;
}
