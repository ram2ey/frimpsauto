"use client";

import { useState } from "react";
import { UserPlus, Eye, EyeOff, Wand2 } from "lucide-react";
import { createStaff } from "@/app/auth-actions";
import { SubmitButton } from "@/components/submit-button";

export function StaffCreateCard() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
    <section className="card">
      <div className="section-title">
        <div>
          <h2>Create staff account</h2>
          <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
            Provision a new workshop user with role-based access.
          </p>
        </div>
        <span className="round-icon" aria-hidden="true">
          <UserPlus size={16} strokeWidth={1.5} />
        </span>
      </div>

      <form action={createStaff} className="stack" style={{ gap: 16 }}>
        <div>
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            maxLength={100}
            required
            placeholder="e.g. Kwame Mensah"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
            autoComplete="off"
            required
            placeholder="e.g. kmensah"
          />
          <small className="muted" style={{ display: "block", marginTop: 4 }}>
            3 to 32 characters using letters, numbers, dots, dashes, or underscores.
          </small>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
            <label htmlFor="password" style={{ margin: 0 }}>
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
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={12}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              placeholder="Minimum 12 characters"
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
            User must change this temporary password upon first login.
          </small>
        </div>

        <div>
          <label htmlFor="role">Role & permissions</label>
          <select id="role" name="role" required defaultValue="TECHNICIAN">
            <option value="TECHNICIAN">Technician — Job inspections, requisitions & labor</option>
            <option value="SUPERVISOR">Supervisor — Floor assignment, approvals & sign-off</option>
            <option value="FINANCE">Finance — Invoicing, payments & financial reports</option>
            <option value="ADMIN">Admin — Full system configuration & user access</option>
          </select>
        </div>

        <SubmitButton pendingLabel="Creating user..." style={{ alignSelf: "start" }}>
          Create user
        </SubmitButton>
      </form>
    </section>
  );
}
