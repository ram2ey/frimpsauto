import { Role } from "@/generated/prisma/client";
import { createTemplate, updateTemplate } from "@/app/checklist-actions";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Checklists() {
  await requireRole([Role.ADMIN]);
  const templates = await db.checklistTemplate.findMany({ include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } });
  return <main className="content"><div className="page-head"><div><h1>Inspection checklists</h1></div></div>
    <div className="grid two"><div className="stack">{templates.map(template => <section className="card" key={template.id}><div className="section-title"><h2>{template.name}</h2><span className={`pill ${template.active ? "approved" : "rejected"}`}>{template.active ? "Active" : "Inactive"}</span></div><form action={updateTemplate.bind(null, template.id)} className="stack"><div><label htmlFor={`name-${template.id}`}>Template name</label><input id={`name-${template.id}`} name="name" defaultValue={template.name} required/></div><div><label htmlFor={`items-${template.id}`}>Checklist items (one per line)</label><textarea id={`items-${template.id}`} name="items" defaultValue={template.items.map(item => item.label).join("\n")} required style={{ minHeight: 190 }}/></div><label className="row"><input type="checkbox" name="active" defaultChecked={template.active} style={{ width: "auto" }}/> Active for new jobs</label><button className="btn btn-secondary" style={{ alignSelf: "start" }}>Save template</button></form></section>)}{!templates.length && <div className="card empty">No checklist templates yet.</div>}</div><div><section className="card"><h2>Create checklist template</h2><form action={createTemplate} className="stack"><div><label htmlFor="name-new">Template name</label><input id="name-new" name="name" required placeholder="Service inspection"/></div><div><label htmlFor="items-new">Items (one per line)</label><textarea id="items-new" name="items" required style={{ minHeight: 230 }} placeholder={"Exterior and lights\nTyres and wheels\nBrake system"}/></div><button className="btn btn-primary" style={{ alignSelf: "start" }}>Create template</button></form></section></div></div>
  </main>;
}
