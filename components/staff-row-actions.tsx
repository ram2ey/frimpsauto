"use client";

import { useRef, useState } from "react";
import { KeyRound, Eye, EyeOff, ShieldAlert, X, Wand2, Pencil } from "lucide-react";
import { setStaffActive, setStaffPassword, updateStaff } from "@/app/auth-actions";
import { SubmitButton } from "@/components/submit-button";

interface StaffMemberProps {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
}

export function StaffRowActions({
  member,
  isCurrentAccount = false,
}: {
  member: StaffMemberProps;
  isCurrentAccount?: boolean;
}) {
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const resetDialogRef = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const openEditModal = () => {
    editDialogRef.current?.showModal();
  };

  const closeEditModal = () => {
    editDialogRef.current?.close();
  };

  const openResetModal = () => {
    setPassword("");
    setShowPassword(false);
    resetDialogRef.current?.showModal();
  };

  const closeResetModal = () => {
    resetDialogRef.current?.close();
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let generated = "";
    for (let i = 0; i < 16; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  return (
    <>
      <div className="row" style={{ gap: 8, flexWrap: "nowrap", alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={openEditModal}
          title={`Edit details for ${member.name}`}
          aria-haspopup="dialog"
        >
          <Pencil size={13} aria-hidden="true" />
          <span>Edit</span>
        </button>

        {!isCurrentAccount ? (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={openResetModal}
              title={`Reset temporary password for ${member.name}`}
              aria-haspopup="dialog"
            >
              <KeyRound size={13} aria-hidden="true" />
              <span>Reset password</span>
            </button>

            <form action={setStaffActive.bind(null, member.id)}>
              <input type="hidden" name="active" value={member.active ? "false" : "true"} />
              <SubmitButton
                type="submit"
                className={`btn btn-small ${member.active ? "btn-secondary" : "btn-teal"}`}
                title={member.active ? `Disable access for ${member.name}` : `Enable access for ${member.name}`}
              >
                {member.active ? "Disable" : "Enable"}
              </SubmitButton>
            </form>
          </>
        ) : (
          <span className="muted" style={{ fontSize: "0.74rem" }}>
            Current account
          </span>
        )}
      </div>

      {/* Edit Details Dialog */}
      <dialog
        ref={editDialogRef}
        id={`edit-modal-${member.id}`}
        className="modal-dialog"
        aria-labelledby={`edit-modal-title-${member.id}`}
        onClick={(e) => {
          if (e.target === editDialogRef.current) {
            closeEditModal();
          }
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div>
              <h3 id={`edit-modal-title-${member.id}`}>Edit Staff Details</h3>
              <p className="modal-subtitle">
                Update name, username, or role for <strong>{member.name}</strong> (@{member.username}).
              </p>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={closeEditModal}
              aria-label="Close dialog"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          <form action={updateStaff.bind(null, member.id)} className="stack" style={{ gap: 14 }}>
            <div>
              <label htmlFor={`edit-name-${member.id}`}>Full name</label>
              <input
                id={`edit-name-${member.id}`}
                name="name"
                defaultValue={member.name}
                maxLength={100}
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor={`edit-username-${member.id}`}>Username</label>
              <input
                id={`edit-username-${member.id}`}
                name="username"
                defaultValue={member.username}
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
                autoComplete="off"
                required
              />
              <small className="muted" style={{ display: "block", marginTop: 4 }}>
                3 to 32 characters using letters, numbers, dots, dashes, or underscores.
              </small>
            </div>

            <div>
              <label htmlFor={`edit-role-${member.id}`}>Role & permissions</label>
              {isCurrentAccount ? (
                <>
                  <select id={`edit-role-${member.id}`} name="role" defaultValue={member.role} disabled>
                    <option value="ADMIN">Admin — Full system configuration & user access</option>
                  </select>
                  <input type="hidden" name="role" value="ADMIN" />
                  <small className="muted" style={{ display: "block", marginTop: 4 }}>
                    You cannot change your own role from Admin while logged in.
                  </small>
                </>
              ) : (
                <select id={`edit-role-${member.id}`} name="role" required defaultValue={member.role}>
                  <option value="TECHNICIAN">Technician — Job inspections, requisitions & labor</option>
                  <option value="SUPERVISOR">Supervisor — Floor assignment, approvals & sign-off</option>
                  <option value="FINANCE">Finance — Invoicing, payments & financial reports</option>
                  <option value="SHOP_STAFF">Shop Staff — Retail Parts Shop counter sales & stock receiving</option>
                  <option value="ADMIN">Admin — Full system configuration & user access</option>
                </select>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={closeEditModal}>
                Cancel
              </button>
              <SubmitButton type="submit" className="btn btn-primary btn-small" pendingLabel="Saving...">
                Save changes
              </SubmitButton>
            </div>
          </form>
        </div>
      </dialog>

      {/* Reset Password Dialog */}
      <dialog
        ref={resetDialogRef}
        id={`reset-modal-${member.id}`}
        className="modal-dialog"
        aria-labelledby={`reset-modal-title-${member.id}`}
        onClick={(e) => {
          if (e.target === resetDialogRef.current) {
            closeResetModal();
          }
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div>
              <h3 id={`reset-modal-title-${member.id}`}>Reset Temporary Password</h3>
              <p className="modal-subtitle">
                Set a new temporary password for <strong>{member.name}</strong> (@{member.username}).
              </p>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={closeResetModal}
              aria-label="Close dialog"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>

          <form action={setStaffPassword.bind(null, member.id)} className="stack" style={{ gap: 14 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                <label htmlFor={`password-${member.id}`} style={{ margin: 0 }}>
                  Temporary password
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="btn btn-secondary btn-small"
                  style={{ minHeight: "26px", padding: "2px 8px", fontSize: "0.68rem" }}
                  title="Generate a secure temporary password"
                >
                  <Wand2 size={11} aria-hidden="true" />
                  <span>Generate</span>
                </button>
              </div>

              <div className="password-input-wrap">
                <input
                  id={`password-${member.id}`}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
              <small className="muted" style={{ display: "block", marginTop: 4 }}>
                At least 6 characters, up to 72 bytes. The user will be required to change it upon next login.
              </small>
            </div>

            <div className="modal-warning-box">
              <ShieldAlert size={18} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Setting a temporary password immediately invalidates all active sessions for this user.</span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={closeResetModal}>
                Cancel
              </button>
              <SubmitButton type="submit" className="btn btn-primary btn-small" pendingLabel="Saving...">
                Set password
              </SubmitButton>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
