import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { adjustStock, updatePart } from "@/app/inventory-actions";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { date, money } from "@/lib/format";

export default async function PartDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole([Role.SUPERVISOR, Role.FINANCE]);
  const { id } = await params;
  const part = await db.part.findUnique({ where: { id }, include: { stockMoves: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 30 } } });
  if (!part) notFound();
  const manage = user.role === Role.FINANCE || user.role === Role.ADMIN;
  return <main className="content"><div className="page-head"><div><div className="eyebrow">Inventory / {part.sku}</div><h1>{part.name}</h1><p className="subtitle">{money(part.priceCents)} per unit · {part.stockQty} units on hand</p></div><Link className="btn btn-secondary" href="/inventory">All parts</Link></div>
    <div className="grid two mb"><section className="card"><h2>Part details</h2>{manage ? <form action={updatePart.bind(null, id)} className="stack"><div><label htmlFor="name">Name</label><input id="name" name="name" defaultValue={part.name} required/></div><div className="form-grid"><div><label htmlFor="price">Price</label><input id="price" name="price" type="number" min="0" step="0.01" defaultValue={(part.priceCents/100).toFixed(2)} required/></div><div><label htmlFor="reorderLevel">Reorder level</label><input id="reorderLevel" name="reorderLevel" type="number" min="0" step="1" defaultValue={part.reorderLevel} required/></div></div><label className="row"><input type="checkbox" name="active" defaultChecked={part.active} style={{ width: "auto" }}/> Active in catalog</label><button className="btn btn-primary" style={{ alignSelf: "start" }}>Save part</button></form> : <dl className="detail-list"><dt>SKU</dt><dd>{part.sku}</dd><dt>Unit price</dt><dd>{money(part.priceCents)}</dd><dt>Stock</dt><dd>{part.stockQty}</dd><dt>Reorder level</dt><dd>{part.reorderLevel}</dd></dl>}</section>
      {manage && <section className="card"><h2>Stock adjustment</h2><p className="subtitle mb">Record incoming stock or a correction with a reason.</p><form action={adjustStock.bind(null, id)} className="stack"><div><label htmlFor="delta">Quantity change</label><input id="delta" name="delta" type="number" step="1" required placeholder="+10 or -2"/><p className="hint">Use a positive number to add stock, negative to remove stock.</p></div><div><label htmlFor="reason">Reason</label><input id="reason" name="reason" required maxLength={300}/></div><button className="btn btn-primary" style={{ alignSelf: "start" }}>Record adjustment</button></form></section>}</div>
    <section className="card"><h2>Recent stock movements</h2><div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Change</th><th>Reason</th><th>Recorded by</th></tr></thead><tbody>{part.stockMoves.map(move => <tr key={move.id}><td>{date(move.createdAt)}</td><td style={{ color: move.delta < 0 ? "#a93d3d" : "#147e6a", fontWeight: 800 }}>{move.delta > 0 ? "+" : ""}{move.delta}</td><td>{move.reason}</td><td>{move.user.name}</td></tr>)}</tbody></table>{!part.stockMoves.length && <div className="empty">No stock movements yet.</div>}</div></section>
  </main>;
}
