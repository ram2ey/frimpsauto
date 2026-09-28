import { Role } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
import { StaffRowActions } from "@/components/staff-row-actions";
import { StaffCreateCard } from "@/components/staff-create-card";

export default async function Team({ searchParams }: { searchParams: Promise<{ created?: string; reset?: string; error?: string }> }) {
  const actor = await requireRole([Role.ADMIN]);
  const { created, reset, error } = await searchParams;
  const staff = await db.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="content">
      <div className="page-head">
        <div>
          <div className="eyebrow">Workshop Administration</div>
          <h1>Staff & access</h1>
          <p className="subtitle">Manage user accounts, roles, access status, and security credentials.</p>
        </div>
      </div>

      {error && <div className="notice" role="alert">{error}</div>}
      {(created === "1" || reset === "1") && (
        <div className="notice success" role="status">
          {created === "1" ? "Staff account created successfully." : "Temporary password set. Other active sessions were signed out."}
        </div>
      )}

      <div className="team-layout">
        <section className="card">
          <div className="section-title">
            <div>
              <h2>Staff accounts</h2>
              <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                Active personnel with authorized workshop access.
              </p>
            </div>
            <span className="pill" style={{ fontVariantNumeric: "tabular-nums" }}>
              {staff.length} {staff.length === 1 ? "member" : "members"}
            </span>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Staff member</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                  <th scope="col">Access & Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="team-user-cell">
                        <span className="avatar" aria-hidden="true">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="team-user-meta">
                          <strong>{member.name}</strong>
                          <small>@{member.username}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`pill role-${member.role.toLowerCase()}`}>
                        {member.role.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${member.active ? "approved" : "rejected"}`}>
                        {!member.active
                          ? "Disabled"
                          : !member.passwordHash
                            ? "Needs password"
                            : member.mustChangePassword
                              ? "Change required"
                              : "Active"}
                      </span>
                    </td>
                    <td className="date-cell">{date(member.createdAt)}</td>
                    <td>
                      {member.id === actor.id ? (
                        <span className="muted" style={{ fontSize: "0.74rem" }}>
                          Current account
                        </span>
                      ) : (
                        <StaffRowActions member={member} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <StaffCreateCard />
      </div>
    </main>
  );
}
