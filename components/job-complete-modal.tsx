"use client";

import { useRef } from "react";
import { CheckCircle2, X, AlertTriangle, Check, PackageCheck, AlertCircle } from "lucide-react";
import { closeJob } from "@/app/job-actions";
import { SubmitButton } from "@/components/submit-button";

type PartRequestSummary = {
  id: string;
  status: string;
  part: { name: string };
};

interface JobCompleteModalProps {
  jobId: string;
  jobNumber: number;
  vehicleTitle: string;
  checklistCount: number;
  totalChecklistCount: number;
  partRequests: PartRequestSummary[];
}

export function JobCompleteModal({
  jobId,
  jobNumber,
  vehicleTitle,
  checklistCount,
  totalChecklistCount,
  partRequests,
}: JobCompleteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openRequests = partRequests.filter(
    (r) => r.status === "REQUESTED" || r.status === "APPROVED"
  );
  const issuedRequests = partRequests.filter((r) => r.status === "ISSUED");
  const hasBlockers = openRequests.length > 0;
  const isChecklistComplete = checklistCount === totalChecklistCount && totalChecklistCount > 0;

  const openModal = () => {
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  return (
    <>
      <div className={`job-completion-bar card mt ${hasBlockers ? "has-blocker" : ""}`}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>Job order completion</strong>
            {hasBlockers ? (
              <span className="pill rejected">{openRequests.length} pending parts blocker</span>
            ) : (
              <span className="pill approved">Ready to close</span>
            )}
          </div>
          <p className="hint" style={{ margin: "4px 0 0" }}>
            {hasBlockers
              ? `Cannot complete bay work yet: ${openRequests.length} open parts request(s) must be issued or rejected.`
              : "Review completion checklist before finalizing this vehicle's workshop visit."}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-teal"
          onClick={openModal}
          aria-haspopup="dialog"
          title={`Complete Job #${String(jobNumber).padStart(5, "0")}`}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Mark job complete</span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        id={`complete-modal-${jobId}`}
        className="modal-dialog"
        aria-labelledby={`complete-modal-title-${jobId}`}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            closeModal();
          }
        }}
      >
        <div className="modal-card">
          <div className="modal-header">
            <div>
              <h3 id={`complete-modal-title-${jobId}`}>
                Complete Job #{String(jobNumber).padStart(5, "0")}
              </h3>
              <p className="modal-subtitle">
                {vehicleTitle} · Finalize workshop execution
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

          <div className="stack" style={{ gap: 14 }}>
            {/* Prerequisite: Inspection Checklist */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: isChecklistComplete ? "#f0fbf4" : "#fbf8f0",
                border: `1px solid ${isChecklistComplete ? "#bfe8cb" : "#e9ddbf"}`,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: isChecklistComplete ? "#2e7d32" : "#b26a00",
                  color: "#fff",
                  flexShrink: 0,
                  marginTop: 1,
                }}
                aria-hidden="true"
              >
                {isChecklistComplete ? <Check size={14} strokeWidth={2.5} /> : <AlertTriangle size={13} strokeWidth={2} />}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: "0.82rem", display: "block" }}>
                  Inspection Checklist ({checklistCount}/{totalChecklistCount} checked)
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>
                  {isChecklistComplete
                    ? "All inspection points have been recorded."
                    : `${totalChecklistCount - checklistCount} item(s) are still pending inspection.`}
                </p>
              </div>
            </div>

            {/* Prerequisite: Parts Requisitions */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                background: hasBlockers ? "#fdf0ee" : "#f0fbf4",
                border: `1px solid ${hasBlockers ? "#f1b7b7" : "#bfe8cb"}`,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: hasBlockers ? "#c62828" : "#2e7d32",
                  color: "#fff",
                  flexShrink: 0,
                  marginTop: 1,
                }}
                aria-hidden="true"
              >
                {hasBlockers ? <AlertCircle size={14} strokeWidth={2} /> : <PackageCheck size={14} strokeWidth={2} />}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: "0.82rem", display: "block" }}>
                  Parts Requisitions ({issuedRequests.length} issued
                  {openRequests.length > 0 ? `, ${openRequests.length} open` : ""})
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: hasBlockers ? "#991b1b" : "var(--muted)" }}>
                  {hasBlockers
                    ? `Blocker: Open part requests must be issued or rejected before closing.`
                    : partRequests.length === 0
                      ? "No parts were requested for this job."
                      : "All requested workshop parts have been resolved."}
                </p>
              </div>
            </div>

            {/* Operational Impact Notice */}
            <div className="modal-warning-box" style={{ marginTop: 0 }}>
              <CheckCircle2 size={16} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Marking this job as complete sets the vehicle ready for handover, locks the inspection checklist, and signals Finance to finalize billing.
              </span>
            </div>
          </div>

          <form action={closeJob.bind(null, jobId)}>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={closeModal}
              >
                Keep job open
              </button>
              <SubmitButton
                type="submit"
                className="btn btn-teal btn-small"
                disabled={hasBlockers}
                pendingLabel="Completing job..."
                title={hasBlockers ? "Resolve open part requests first" : "Mark job complete"}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Mark job complete</span>
              </SubmitButton>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
