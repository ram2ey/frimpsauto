import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { Role } from "@/generated/prisma/client";
import { createPart } from "@/app/inventory-actions";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export default async function Inventory() {
  const user = await requireRole([Role.SUPERVISOR, Role.FINANCE]);
  const manage = user.role === Role.FINANCE || user.role === Role.ADMIN;
  const parts = await db.part.findMany({ orderBy: { name: "asc" } });
  const low = parts.filter(part => part.active && part.stockQty <= part.reorderLevel).length;
  return <main className="content"><div className="page-head"><div><h1>Parts inventory</h1></div><span className="pill waiting_parts">{low} low stock</span></div>
    <div className="grid three mb"><div className="card stat"><div className="label">Catalog parts</div><div className="value">{parts.length}</div></div><div className="card stat"><div className="label">Units on hand</div><div className="value">{parts.reduce((sum, part) => sum + part.stockQty, 0)}</div></div><div className="card stat"><div className="label">Low stock parts</div><div className="value">{low}</div></div></div>
    <section className="card mb"><div className="section-title"><h2>All parts</h2></div><div className="table-wrap"><table className="table"><thead><tr><th>Part</th><th>SKU</th><th>Unit price</th><th>In stock</th><th>Reorder at</th><th>Status</th></tr></thead><tbody>{parts.map(part => <tr key={part.id}><td><Link className="text-link" href={`/inventory/${part.id}`}>{part.name}</Link></td><td>{part.sku}</td><td>{money(part.priceCents)}</td><td>{part.stockQty}</td><td>{part.reorderLevel}</td><td><span className={`pill ${part.active ? part.stockQty <= part.reorderLevel ? "waiting_parts" : "approved" : "rejected"}`}>{!part.active ? "Inactive" : part.stockQty <= part.reorderLevel ? "Low stock" : "Available"}</span></td></tr>)}</tbody></table>{!parts.length && <div className="empty">No parts in the catalog yet.</div>}</div></section>
    {manage && <section className="card"><div className="section-title"><h2>Add a part</h2><PackagePlus size={19}/></div><form action={createPart} className="form-grid"><div><label htmlFor="sku">SKU / part number</label><input id="sku" name="sku" required maxLength={60}/></div><div><label htmlFor="name">Part name</label><input id="name" name="name" required maxLength={160}/></div><div><label htmlFor="price">Unit price</label><input id="price" name="price" type="number" step="0.01" min="0" required/></div><div><label htmlFor="stockQty">Opening quantity</label><input id="stockQty" name="stockQty" type="number" step="1" min="0" defaultValue="0" required/></div><div><label htmlFor="reorderLevel">Reorder level</label><input id="reorderLevel" name="reorderLevel" type="number" step="1" min="0" defaultValue="0" required/></div><div style={{ alignSelf: "end" }}><button className="btn btn-primary">Add part</button></div></form></section>}
  </main>;
}
