"use client";

import { useState } from "react";
import { Pencil, Check, X, AlertCircle } from "lucide-react";
import { updateComplaint } from "@/app/job-actions";
import { SubmitButton } from "@/components/submit-button";

interface JobComplaintProps {
  jobId: string;
  complaint: string;
  editable: boolean;
}

export function JobComplaint({ jobId, complaint, editable }: JobComplaintProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [textValue, setTextValue] = useState(complaint);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(formData: FormData) {
    setError(null);
    try {
      await updateComplaint(jobId, formData);
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update customer complaint.");
    }
  }

  return (
    <div className="job-complaint-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <p className="muted" style={{ margin: 0, fontSize: ".75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em" }}>
          Customer complaint & service requested
        </p>
        {editable && !isEditing && (
          <button
            type="button"
            onClick={() => {
              setTextValue(complaint);
              setError(null);
              setIsEditing(true);
            }}
            className="btn btn-secondary btn-small no-print"
            style={{ minHeight: 28, padding: "3px 10px", fontSize: ".72rem", gap: 5 }}
            aria-label="Edit customer complaint"
          >
            <Pencil size={11} aria-hidden="true" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <form action={handleSave} className="stack no-print" style={{ gap: 8 }}>
          {error && (
            <div
              className="notice"
              role="alert"
              style={{
                background: "#fef2f2",
                color: "#991b1b",
                borderColor: "#fecaca",
                padding: "8px 12px",
                fontSize: ".76rem",
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 4,
              }}
            >
              <AlertCircle size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="complaint-input" className="sr-only">Customer complaint</label>
            <textarea
              id="complaint-input"
              name="complaint"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              rows={4}
              maxLength={3000}
              required
              autoFocus
              style={{ width: "100%", fontSize: ".82rem", lineHeight: 1.5, minHeight: 90 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span className="hint" style={{ margin: 0, fontSize: ".7rem" }}>
                Keep vehicle symptoms, customer observations, or dashboard warnings accurate before closing.
              </span>
              <span className="muted" style={{ fontSize: ".68rem", fontVariantNumeric: "tabular-nums" }}>
                {textValue.length}/3000
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SubmitButton
              className="btn btn-primary btn-small"
              pendingLabel="Saving..."
              style={{ minHeight: 32, padding: "4px 12px", fontSize: ".75rem" }}
            >
              <Check size={12} aria-hidden="true" />
              <span>Save complaint</span>
            </SubmitButton>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError(null);
                setTextValue(complaint);
              }}
              className="btn btn-secondary btn-small"
              style={{ minHeight: 32, padding: "4px 10px", fontSize: ".75rem" }}
            >
              <X size={12} aria-hidden="true" />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      ) : (
        <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.55 }}>{complaint}</p>
      )}

      {/* Always ensure pure complaint text prints without form controls */}
      {isEditing && (
        <p className="print-only" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {complaint}
        </p>
      )}
    </div>
  );
}
