import { saveInspectionChecklist } from "@/app/job-actions";

type InspectionItem = { id: string; label: string; result: string | null; note: string | null };

export function JobInspection({ jobId, mileage, items, edit }: { jobId: string; mileage: number | null; items: InspectionItem[]; edit: boolean }) {
  return <section className="card">
    <div className="section-title"><h2>Inspection checklist</h2><span className="pill">{items.filter(item => item.result).length}/{items.length} checked</span></div>
    {edit ? <form action={saveInspectionChecklist.bind(null, jobId)}>
      <div className="check-row mileage-row"><strong>Mileage at this visit</strong><input name="mileage" type="number" min="0" max="2147483647" step="1" defaultValue={mileage ?? ""} aria-label="Mileage at this visit"/></div>
      {items.map(item => <div className="check-row inspection-edit-row" key={item.id}>
        <strong>{item.label}</strong>
        <select name={`result:${item.id}`} defaultValue={item.result || ""} aria-label={`${item.label} result`}><option value="">Not checked</option><option value="PASS">Pass</option><option value="ATTENTION">Needs attention</option><option value="NOT_APPLICABLE">N/A</option></select>
        <input name={`note:${item.id}`} defaultValue={item.note || ""} maxLength={500} placeholder="Note (optional)" aria-label={`${item.label} note`}/>
      </div>)}
      <div className="inspection-save"><button className="btn btn-primary">Save checklist</button></div>
    </form> : <>
      <div className="check-row mileage-row"><strong>Mileage at this visit</strong><span>{mileage?.toLocaleString() ?? "—"}</span></div>
      {items.map(item => <div className="check-row" key={item.id}>
        <strong>{item.label}</strong>
        <span className={`pill ${item.result === "ATTENTION" ? "rejected" : item.result === "PASS" ? "paid" : ""}`}>{item.result?.replaceAll("_", " ") || "Not checked"}</span>
        <span className="muted">{item.note || ""}</span>
      </div>)}
    </>}
  </section>;
}
