import { saveInspectionChecklist } from "@/app/job-actions";
import { Check, AlertTriangle, Minus, CircleDashed } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";

type InspectionItem = { id: string; label: string; result: string | null; note: string | null };

export function JobInspection({ jobId, mileage, items, edit }: { jobId: string; mileage: number | null; items: InspectionItem[]; edit: boolean }) {
  const checkedCount = items.filter((item) => item.result).length;
  const passCount = items.filter((item) => item.result === "PASS").length;
  const attentionCount = items.filter((item) => item.result === "ATTENTION").length;
  const naCount = items.filter((item) => item.result === "NOT_APPLICABLE").length;
  const progressPercent = items.length ? Math.round((checkedCount / items.length) * 100) : 0;

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

          {items.map((item) => (
            <div className="check-row inspection-edit-row" key={item.id}>
              <strong>{item.label}</strong>

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
          ))}

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

          {items.map((item) => (
            <div className="check-row" key={item.id}>
              <strong>{item.label}</strong>
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
          ))}
        </div>
      )}
    </section>
  );
}
