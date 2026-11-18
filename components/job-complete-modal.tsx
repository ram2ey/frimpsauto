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
  issueCount: number;
  unreportedIssues: number;
  notFixedIssues: number;
}

export function JobCompleteModal({
  jobId,
  jobNumber,
  vehicleTitle,
  checklistCount,
  totalChecklistCount,
  partRequests,
  issueCount,
  unreportedIssues,
  notFixedIssues,
}: JobCompleteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openRequests = partRequests.filter(
    (r) => r.status === "REQUESTED" || r.status === "APPROVED"
  );
  const issuedRequests = partRequests.filter((r) => r.status === "ISSUED");
  const hasPartBlockers = openRequests.length > 0;
  const hasBlockers = hasPartBlockers || unreportedIssues > 0;
  const blockerSummary = [
    openRequests.length > 0 && `${openRequests.length} open parts request(s) must be issued or rejected`,
    unreportedIssues > 0 && `${unreportedIssues} issue(s) still need a technician report`,
  ].filter(Boolean).join("; ");
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
              <span className="pill rejected">Not ready to close</span>
            ) : (
              <span className="pill approved">Ready to close</span>
            )}
          </div>
          <p className="hint" style={{ margin: "4px 0 0" }}>
            {hasBlockers
              ? `Cannot complete bay work yet: ${blockerSummary}.`
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
                background: hasPartBlockers ? "#fdf0ee" : "#f0fbf4",
                border: `1px solid ${hasPartBlockers ? "#f1b7b7" : "#bfe8cb"}`,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: hasPartBlockers ? "#c62828" : "#2e7d32",
                  color: "#fff",
                  flexShrink: 0,
                  marginTop: 1,
                }}
                aria-hidden="true"
              >
                {hasPartBlockers ? <AlertCircle size={14} strokeWidth={2} /> : <PackageCheck size={14} strokeWidth={2} />}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: "0.82rem", display: "block" }}>
                  Parts Requisitions ({issuedRequests.length} issued
                  {openRequests.length > 0 ? `, ${openRequests.length} open` : ""})
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: hasPartBlockers ? "#991b1b" : "var(--muted)" }}>
                  {hasPartBlockers
                    ? `Blocker: Open part requests must be issued or rejected before closing.`
                    : partRequests.length === 0
                      ? "No parts were requested for this job."
                      : "All requested workshop parts have been resolved."}
                </p>
              </div>
            </div>

            {/* Prerequisite: Technician issue report */}
            {issueCount > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: unreportedIssues ? "#fdf0ee" : notFixedIssues ? "#fbf8f0" : "#f0fbf4",
                  border: `1px solid ${unreportedIssues ? "#f1b7b7" : notFixedIssues ? "#e9ddbf" : "#bfe8cb"}`,
                }}
              >
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: unreportedIssues ? "#c62828" : notFixedIssues ? "#b26a00" : "#2e7d32",
                    color: "#fff",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                  aria-hidden="true"
                >
                  {unreportedIssues ? <AlertCircle size={14} strokeWidth={2} /> : notFixedIssues ? <AlertTriangle size={13} strokeWidth={2} /> : <Check size={14} strokeWidth={2.5} />}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: "0.82rem", display: "block" }}>
                    Technician report ({issueCount - unreportedIssues}/{issueCount} issues reported)
                  </strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: unreportedIssues ? "#991b1b" : "var(--muted)" }}>
                    {unreportedIssues
                      ? `Blocker: ${unreportedIssues} issue(s) have no fixed / not fixed answer yet.`
                      : notFixedIssues
                        ? `${notFixedIssues} issue(s) were not fully fixed. Review the notes before handing the vehicle over.`
                        : "All listed issues were fixed."}
                  </p>
                </div>
              </div>
            )}

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
                title={hasBlockers ? "Resolve the blockers above first" : "Mark job complete"}
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
