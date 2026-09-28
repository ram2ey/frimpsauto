import { saveInspectionChecklist } from "@/app/job-actions";
import { Check, AlertTriangle, Minus, CircleDashed, History } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { date } from "@/lib/format";

type InspectionItem = { id: string; label: string; result: string | null; note: string | null };

type PreviousInspection = {
  id: string;
  number: number;
  createdAt: Date | string;
  mileage: number | null;
  items: { id: string; label: string; result: string | null; note: string | null }[];
};

export function JobInspection({
  jobId,
  mileage,
  items,
  edit,
  previousInspection,
}: {
  jobId: string;
  mileage: number | null;
  items: InspectionItem[];
  edit: boolean;
  previousInspection?: PreviousInspection | null;
}) {
  const checkedCount = items.filter((item) => item.result).length;
  const passCount = items.filter((item) => item.result === "PASS").length;
  const attentionCount = items.filter((item) => item.result === "ATTENTION").length;
  const naCount = items.filter((item) => item.result === "NOT_APPLICABLE").length;
  const progressPercent = items.length ? Math.round((checkedCount / items.length) * 100) : 0;

  const prevMap = new Map(
    (previousInspection?.items || []).map((item) => [item.label.trim().toLowerCase(), item])
  );
  const prevAttentionItems = (previousInspection?.items || []).filter(
    (item) => item.result === "ATTENTION"
  );
  const mileageDiff =
    mileage !== null &&
    mileage !== undefined &&
    previousInspection?.mileage !== null &&
    previousInspection?.mileage !== undefined
      ? mileage - previousInspection.mileage
      : null;

  return (
    <section className="card">
      <div className="section-title">
        <div>
          <h2>Inspection checklist</h2>
          <p className="subtitle" style={{ fontSize: "0.78rem", marginTop: 2 }}>
            Multi-point vehicle inspection and technical findings.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {passCount > 0 && <span className="pill approved">{passCount} pass</span>}
          {attentionCount > 0 && <span className="pill rejected">{attentionCount} attention</span>}
          {naCount > 0 && <span className="pill">{naCount} N/A</span>}
          <span className="pill" style={{ fontVariantNumeric: "tabular-nums" }}>
            {checkedCount}/{items.length} checked ({progressPercent}%)
          </span>
        </div>
      </div>

      <div
        className="inspection-progress-bar"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Inspection progress"
      >
        <div className="inspection-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Previous Visit Comparison Banner (Placed cleanly outside the active form for smoke test safety) */}
      {previousInspection ? (
        <div className="prev-inspection-banner">
          <div className="prev-inspection-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <History size={16} style={{ color: "var(--blue)" }} aria-hidden="true" />
              <strong>
                Previous inspection: Job #{String(previousInspection.number).padStart(5, "0")}
              </strong>
              <span className="muted">· {date(previousInspection.createdAt)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {previousInspection.mileage !== null && (
                <span className="pill" style={{ fontVariantNumeric: "tabular-nums" }}>
                  Last odometer: {previousInspection.mileage.toLocaleString()} km
                  {mileageDiff !== null && mileageDiff >= 0 && (
                    <strong style={{ color: "var(--blue)", marginLeft: 5 }}>
                      (+{mileageDiff.toLocaleString()} km)
                    </strong>
                  )}
                </span>
              )}
              {prevAttentionItems.length > 0 ? (
                <span className="pill rejected">
                  {prevAttentionItems.length} flagged on last visit
                </span>
              ) : (
                <span className="pill approved">All points passed on last visit</span>
              )}
            </div>
          </div>

          {prevAttentionItems.length > 0 && (
            <div className="prev-attention-callout">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <AlertTriangle size={14} style={{ color: "#92400e" }} aria-hidden="true" />
                <strong style={{ fontSize: "0.8rem", color: "#92400e" }}>
                  Items requiring attention from last visit:
                </strong>
              </div>
              <div className="prev-attention-tags">
                {prevAttentionItems.map((p) => (
                  <div key={p.id} className="prev-attention-item">
                    <span className="prev-attention-title">{p.label}:</span>
                    <span className="prev-attention-note">
                      {p.note || "Marked for workshop attention"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <details className="prev-details-accordion">
            <summary className="prev-details-summary">
              View all {previousInspection.items.length} points from Job #{String(previousInspection.number).padStart(5, "0")}
            </summary>
            <div className="prev-details-content">
              <div className="table-wrap">
                <table className="table" style={{ fontSize: "0.78rem" }}>
                  <thead>
                    <tr>
                      <th>Inspection Point</th>
                      <th>Result</th>
                      <th>Notes / Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previousInspection.items.map((prevItem) => (
                      <tr key={prevItem.id}>
                        <td><strong>{prevItem.label}</strong></td>
                        <td>
                          <span
                            className={`pill ${
                              prevItem.result === "ATTENTION"
                                ? "rejected"
                                : prevItem.result === "PASS"
                                  ? "approved"
                                  : ""
                            }`}
                            style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                          >
                            {prevItem.result ? prevItem.result.replaceAll("_", " ") : "Not checked"}
                          </span>
                        </td>
                        <td>{prevItem.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>
      ) : (
        <div className="first-inspection-badge">
          <small className="muted">
            ℹ️ First recorded digital inspection for this vehicle.
          </small>
        </div>
      )}

      {edit ? (
        <form action={saveInspectionChecklist.bind(null, jobId)} style={{ marginTop: 14 }}>
          <div className="check-row mileage-row">
            <div>
              <strong>Mileage at this visit</strong>
              <p className="subtitle" style={{ fontSize: "0.74rem", margin: "2px 0 0" }}>Odometer reading</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                name="mileage"
                type="number"
                min="0"
                max="2147483647"
                step="1"
                defaultValue={mileage ?? ""}
                aria-label="Mileage at this visit"
                placeholder="e.g. 125000"
                style={{ maxWidth: 180 }}
              />
              <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 500 }}>km</span>
            </div>
          </div>

          {items.map((item) => {
            const prevItem = prevMap.get(item.label.trim().toLowerCase());
            return (
              <div className="check-row inspection-edit-row" key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  {prevItem && (
                    <div className="prev-item-tag-wrap">
                      {prevItem.result === "ATTENTION" && (
                        <span className="prev-item-tag attention" title={`Flagged in Job #${previousInspection?.number}`}>
                          <AlertTriangle size={11} aria-hidden="true" />
                          Last visit: Needs attention {prevItem.note ? `("${prevItem.note}")` : ""}
                        </span>
                      )}
                      {prevItem.result === "PASS" && (
                        <span className="prev-item-tag pass" title={`Passed in Job #${previousInspection?.number}`}>
                          <Check size={11} strokeWidth={2.5} aria-hidden="true" />
                          Last visit: Pass
                        </span>
                      )}
                      {prevItem.result === "NOT_APPLICABLE" && (
                        <span className="prev-item-tag na">
                          <Minus size={11} aria-hidden="true" />
                          Last visit: N/A
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="segmented-control" role="radiogroup" aria-label={`${item.label} result`}>
                  <input
                    type="radio"
                    id={`result-${item.id}-none`}
                    name={`result:${item.id}`}
                    value=""
                    defaultChecked={!item.result}
                    className="sr-only"
                  />
                  <label htmlFor={`result-${item.id}-none`} className="segmented-item neutral" title="Not checked yet">
                    <CircleDashed size={12} aria-hidden="true" />
                    <span>Pending</span>
                  </label>

                  <input
                    type="radio"
                    id={`result-${item.id}-pass`}
                    name={`result:${item.id}`}
                    value="PASS"
                    defaultChecked={item.result === "PASS"}
                    className="sr-only"
                  />
                  <label htmlFor={`result-${item.id}-pass`} className="segmented-item pass" title="Passes inspection">
                    <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                    <span>Pass</span>
                  </label>

                  <input
                    type="radio"
                    id={`result-${item.id}-att`}
                    name={`result:${item.id}`}
                    value="ATTENTION"
                    defaultChecked={item.result === "ATTENTION"}
                    className="sr-only"
                  />
                  <label htmlFor={`result-${item.id}-att`} className="segmented-item attention" title="Requires workshop attention or parts">
                    <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
                    <span>Needs attention</span>
                  </label>

                  <input
                    type="radio"
                    id={`result-${item.id}-na`}
                    name={`result:${item.id}`}
                    value="NOT_APPLICABLE"
                    defaultChecked={item.result === "NOT_APPLICABLE"}
                    className="sr-only"
                  />
                  <label htmlFor={`result-${item.id}-na`} className="segmented-item na" title="Not applicable to this model">
                    <Minus size={13} strokeWidth={2} aria-hidden="true" />
                    <span>N/A</span>
                  </label>
                </div>

                <input
                  name={`note:${item.id}`}
                  defaultValue={item.note || ""}
                  maxLength={500}
                  placeholder="Findings or notes (optional)"
                  aria-label={`${item.label} note`}
                  className="inspection-note-input"
                />
              </div>
            );
          })}

          <div className="inspection-save">
            <SubmitButton pendingLabel="Saving checklist...">Save checklist</SubmitButton>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div className="check-row mileage-row">
            <div>
              <strong>Mileage at this visit</strong>
              <p className="subtitle" style={{ fontSize: "0.74rem", margin: "2px 0 0" }}>Odometer reading</p>
            </div>
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "0.95rem" }}>
              {mileage !== null && mileage !== undefined ? `${mileage.toLocaleString()} km` : "—"}
            </span>
          </div>

          {items.map((item) => {
            const prevItem = prevMap.get(item.label.trim().toLowerCase());
            return (
              <div className="check-row" key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  {prevItem && (
                    <div className="prev-item-tag-wrap">
                      {prevItem.result === "ATTENTION" && (
                        <span className="prev-item-tag attention">
                          <AlertTriangle size={11} aria-hidden="true" />
                          Last visit: Needs attention {prevItem.note ? `("${prevItem.note}")` : ""}
                        </span>
                      )}
                      {prevItem.result === "PASS" && (
                        <span className="prev-item-tag pass">
                          <Check size={11} strokeWidth={2.5} aria-hidden="true" />
                          Last visit: Pass
                        </span>
                      )}
                      {prevItem.result === "NOT_APPLICABLE" && (
                        <span className="prev-item-tag na">
                          <Minus size={11} aria-hidden="true" />
                          Last visit: N/A
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span
                  className={`pill ${
                    item.result === "ATTENTION"
                      ? "rejected"
                      : item.result === "PASS"
                        ? "approved"
                        : ""
                  }`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  {item.result === "PASS" && <Check size={11} strokeWidth={2.5} aria-hidden="true" />}
                  {item.result === "ATTENTION" && <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />}
                  {item.result === "NOT_APPLICABLE" && <Minus size={11} strokeWidth={2} aria-hidden="true" />}
                  {item.result ? item.result.replaceAll("_", " ") : "Not checked"}
                </span>
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {item.note || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
