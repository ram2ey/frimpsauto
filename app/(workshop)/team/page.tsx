import { Role } from "@/generated/prisma/client";
import { inviteStaff, setStaffActive } from "@/app/auth-actions";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";

export default async function Team({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const actor = await requireRole([Role.ADMIN]);
  const { invite } = await searchParams;
  const staff = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  const inviteUrl = invite ? `${process.env.APP_URL || "http://localhost:3000"}/invite/${invite}` : null;
  return <main className="content"><div className="page-head"><div><h1>Staff & access</h1></div></div>
    {inviteUrl && <div className="notice success"><strong>Invitation created.</strong> Share this link privately with the staff member. It expires in 48 hours.<div style={{ overflowWrap: "anywhere", marginTop: ".5rem" }}>{inviteUrl}</div></div>}
    <div className="grid two"><section className="card"><h2>Staff accounts</h2><div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead><tbody>{staff.map(member => <tr key={member.id}><td><strong>{member.name}</strong><br/><small>{member.email}</small></td><td>{member.role.toLowerCase()}</td><td><span className={`pill ${member.active ? "approved" : "rejected"}`}>{member.active ? member.passwordHash ? "Active" : "Invited" : "Disabled"}</span></td><td>{date(member.createdAt)}</td><td>{member.id !== actor.id && <form action={setStaffActive.bind(null, member.id)}><input type="hidden" name="active" value={member.active ? "false" : "true"}/><button className="btn btn-secondary btn-small">{member.active ? "Disable" : "Enable"}</button></form>}</td></tr>)}</tbody></table></div></section><section className="card"><h2>Invite staff member</h2><p className="subtitle mb">Create an account and share the generated setup link privately.</p><form action={inviteStaff} className="stack"><div><label htmlFor="name">Full name</label><input id="name" name="name" required/></div><div><label htmlFor="email">Email</label><input id="email" type="email" name="email" required/></div><div><label htmlFor="role">Role</label><select id="role" name="role" required><option value="SUPERVISOR">Supervisor</option><option value="TECHNICIAN">Technician</option><option value="FINANCE">Finance</option><option value="ADMIN">Admin</option></select></div><button className="btn btn-primary" style={{ alignSelf: "start" }}>Create invitation</button></form></section></div>
  </main>;
}
