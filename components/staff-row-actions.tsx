"use client";

import { useRef, useState } from "react";
import { KeyRound, Eye, EyeOff, ShieldAlert, X, Wand2 } from "lucide-react";
import { setStaffActive, setStaffPassword } from "@/app/auth-actions";
import { SubmitButton } from "@/components/submit-button";

interface StaffMemberProps {
  id: string;
  name: string;
  username: string;
  active: boolean;
}

export function StaffRowActions({ member }: { member: StaffMemberProps }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const openModal = () => {
    setPassword("");
    setShowPassword(false);
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
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
      <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={openModal}
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
      </div>

      <dialog
        ref={dialogRef}
        id={`reset-modal-${member.id}`}
        className="modal-dialog"
        aria-labelledby={`reset-modal-title-${member.id}`}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            closeModal();
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
              onClick={closeModal}
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
                  minLength={12}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
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
                Must be between 12 and 72 characters. The user will be required to change it upon next login.
              </small>
            </div>

            <div className="modal-warning-box">
              <ShieldAlert size={18} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Setting a temporary password immediately invalidates all active sessions for this user.</span>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={closeModal}>
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
