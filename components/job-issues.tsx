import { addIssues, removeIssue, saveIssueReport } from "@/app/job-actions";
import { SubmitButton } from "@/components/submit-button";
import { date } from "@/lib/format";

type Issue = {
  id: string;
  label: string;
  status: "FIXED" | "PARTIAL" | "NOT_FIXED" | null;
  note: string | null;
  reportedAt: Date | null;
  reportedBy: { name: string } | null;
};

const STATUS_LABEL = { FIXED: "Fixed", PARTIAL: "Partly fixed", NOT_FIXED: "Not fixed" } as const;
const STATUS_PILL = { FIXED: "completed", PARTIAL: "partial", NOT_FIXED: "rejected" } as const;

interface JobIssuesProps {
  jobId: string;
  issues: Issue[];
  workNotes: string | null;
  /** Supervisor/admin on an open job: may add issues and remove unanswered ones. */
  canManageList: boolean;
  /** Assigned technician or supervisor/admin on an open job: may set results and issue notes. */
  canReport: boolean;
  /** Assigned technician only: may write the "Other notes" box. */
  canEditWorkNotes: boolean;
}

export function JobIssues({ jobId, issues, workNotes, canManageList, canReport, canEditWorkNotes }: JobIssuesProps) {
  const answered = issues.filter(issue => issue.status).length;

  return (
    <section className="card mb no-print">
      <div className="section-title">
        <h2>Issues & technician report</h2>
        {issues.length > 0 && (
          <span className={`pill ${answered === issues.length ? "completed" : "draft"}`}>
            {answered}/{issues.length} reported
          </span>
        )}
      </div>

      {!issues.length ? (
        <p className="muted">{canManageList ? "No issues listed yet. Add them below for the technician." : "The supervisor has not listed any issues for this job yet."}</p>
      ) : canReport ? (
        <form action={saveIssueReport.bind(null, jobId)} className="stack">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Issue</th>
                  <th scope="col" style={{ width: 160 }}>Result</th>
                  <th scope="col">Note</th>
                  {canManageList && <th scope="col" style={{ width: 90 }} aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue.id}>
                    <td style={{ fontWeight: 500 }}>
                      {issue.label}
                      {issue.reportedBy && issue.reportedAt && (
                        <small className="muted" style={{ display: "block", fontWeight: 400 }}>
                          {issue.reportedBy.name} · {date(issue.reportedAt)}
                        </small>
                      )}
                    </td>
                    <td>
                      <select name={`status:${issue.id}`} defaultValue={issue.status || ""} aria-label={`Result for ${issue.label}`}>
                        <option value="">— Not reported —</option>
                        <option value="FIXED">Fixed</option>
                        <option value="PARTIAL">Partly fixed</option>
                        <option value="NOT_FIXED">Not fixed</option>
                      </select>
                    </td>
                    <td>
                      <input
                        name={`note:${issue.id}`}
                        defaultValue={issue.note || ""}
                        maxLength={500}
                        placeholder="What was done, or why not"
                        aria-label={`Note for ${issue.label}`}
                      />
                    </td>
                    {canManageList && (
                      <td style={{ textAlign: "right" }}>
                        {!issue.status && !issue.note && (
                          <SubmitButton
                            formAction={removeIssue.bind(null, issue.id)}
                            formNoValidate
                            className="btn btn-secondary btn-small"
                            pendingLabel="..."
                            title="Remove this issue (only possible before it has a result or note)"
                          >
                            Remove
                          </SubmitButton>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEditWorkNotes ? (
            <div>
              <label htmlFor="workNotes">Other notes (optional)</label>
              <textarea
                id="workNotes"
                name="workNotes"
                defaultValue={workNotes || ""}
                maxLength={5000}
                placeholder="Anything else found or done, e.g. other faults noticed during the work"
              />
            </div>
          ) : (
            <div>
              <strong style={{ fontSize: "0.85rem" }}>Other notes from the technician</strong>
              <p className={workNotes ? undefined : "muted"} style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>
                {workNotes || "None yet. Only the assigned technician can write these."}
              </p>
            </div>
          )}
          <SubmitButton pendingLabel="Saving report..." style={{ alignSelf: "start" }}>
            Save report
          </SubmitButton>
        </form>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Issue</th>
                  <th scope="col" style={{ width: 130 }}>Result</th>
                  <th scope="col">Technician note</th>
                  {canManageList && <th scope="col" style={{ width: 90 }} aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue.id}>
                    <td style={{ fontWeight: 500 }}>{issue.label}</td>
                    <td>
                      {issue.status ? (
                        <span className={`pill ${STATUS_PILL[issue.status]}`}>{STATUS_LABEL[issue.status]}</span>
                      ) : (
                        <span className="muted">Not reported</span>
                      )}
                    </td>
                    <td>
                      {issue.note || "—"}
                      {issue.reportedBy && issue.reportedAt && (
                        <small className="muted" style={{ display: "block" }}>
                          {issue.reportedBy.name} · {date(issue.reportedAt)}
                        </small>
                      )}
                    </td>
                    {canManageList && (
                      <td style={{ textAlign: "right" }}>
                        {!issue.status && !issue.note && (
                          <form action={removeIssue.bind(null, issue.id)}>
                            <SubmitButton className="btn btn-secondary btn-small" pendingLabel="..." title="Remove this issue (only possible before the technician reports on it)">
                              Remove
                            </SubmitButton>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {workNotes && (
            <div className="mt">
              <strong style={{ fontSize: "0.85rem" }}>Other notes from the technician</strong>
              <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{workNotes}</p>
            </div>
          )}
        </>
      )}

      {canManageList && (
        <form action={addIssues.bind(null, jobId)} className="stack mt">
          <div>
            <label htmlFor="issues">{issues.length ? "Add more issues" : "Issues to fix"}</label>
            <textarea
              id="issues"
              name="issues"
              rows={3}
              required
              placeholder={"Brake squeal front left\nAC not cooling\nCheck engine light on"}
            />
            <p className="hint" style={{ margin: "4px 0 0" }}>
              One issue per line. New issues are added to the end of the list for the technician.
            </p>
          </div>
          <SubmitButton className="btn btn-secondary" pendingLabel="Adding issues..." style={{ alignSelf: "start" }}>
            Add issues
          </SubmitButton>
        </form>
      )}
    </section>
  );
}

/** Always printed on the job sheet, whichever tab is open. Unreported issues get tick boxes to fill in by hand. */
export function JobIssuesPrint({ issues, workNotes }: { issues: Issue[]; workNotes: string | null }) {
  if (!issues.length && !workNotes) return null;
  return (
    <section className="print-only card mt">
      <h2 style={{ fontSize: "10pt", margin: "0 0 6px" }}>Issues & technician report</h2>
      {issues.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th scope="col" style={{ width: 24 }}>#</th>
              <th scope="col">Issue</th>
              <th scope="col" style={{ width: 170 }}>Result</th>
              <th scope="col">Technician note</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, index) => (
              <tr key={issue.id}>
                <td>{index + 1}</td>
                <td>{issue.label}</td>
                <td>
                  {issue.status ? (
                    <strong>{STATUS_LABEL[issue.status]}</strong>
                  ) : (
                    <span style={{ whiteSpace: "nowrap" }}>☐ Fixed ☐ Partly ☐ Not fixed</span>
                  )}
                </td>
                <td>
                  {issue.note || (issue.status ? "—" : "")}
                  {issue.reportedBy && issue.reportedAt && (
                    <small style={{ display: "block", color: "#6b7280" }}>
                      {issue.reportedBy.name} · {date(issue.reportedAt)}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {workNotes && (
        <div style={{ marginTop: 8 }}>
          <strong>Other notes</strong>
          <p style={{ whiteSpace: "pre-wrap", margin: "2px 0 0" }}>{workNotes}</p>
        </div>
      )}
    </section>
  );
}
