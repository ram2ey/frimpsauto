"use client";

import { useState } from "react";
import { createJob } from "@/app/job-actions";

type CustomerOption = { id: string; name: string; phone: string; vehicles: { id: string; year: number; model: { name: string } | null; customModel: string | null; plate: string | null }[] };
type Choice = { id: string; name: string };

export function JobIntake({
  customers,
  models,
  technicians,
  templates,
  initialCustomerId = "",
  initialVehicleId = "",
}: {
  customers: CustomerOption[];
  models: Choice[];
  technicians: Choice[];
  templates: Choice[];
  initialCustomerId?: string;
  initialVehicleId?: string;
}) {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const vehicles = customers.find(customer => customer.id === customerId)?.vehicles || [];
  const years = Array.from({ length: new Date().getFullYear() + 2 - 1926 }, (_, i) => new Date().getFullYear() + 1 - i);
  return <form action={createJob} className="stack">
    <section className="card"><div className="section-title"><h2>Customer</h2></div><div className="form-grid">
      <div className="field field-wide"><label htmlFor="existingCustomerId">Existing customer</label><select id="existingCustomerId" name="existingCustomerId" value={customerId} onChange={event => { setCustomerId(event.target.value); setVehicleId(""); }}><option value="">New customer</option>{customers.map(customer => <option value={customer.id} key={customer.id}>{customer.name} · {customer.phone}</option>)}</select></div>
      {!customerId && <><div className="field"><label htmlFor="customerName">Full name</label><input id="customerName" name="customerName" required maxLength={120}/></div><div className="field"><label htmlFor="customerPhone">Phone</label><input id="customerPhone" name="customerPhone" required maxLength={50}/></div><div className="field field-wide"><label htmlFor="customerEmail">Email (optional)</label><input id="customerEmail" name="customerEmail" type="email"/></div></>}
    </div></section>
    <section className="card"><div className="section-title"><h2>Vehicle</h2></div><div className="form-grid">
      {customerId && <div className="field field-wide"><label htmlFor="existingVehicleId">Existing vehicle</label><select id="existingVehicleId" name="existingVehicleId" value={vehicleId} onChange={event => setVehicleId(event.target.value)}><option value="">Add another vehicle</option>{vehicles.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.year} {vehicle.model?.name || vehicle.customModel} {vehicle.plate ? `· ${vehicle.plate}` : ""}</option>)}</select></div>}
      {!vehicleId && <><div className="field"><label htmlFor="year">Model year</label><select id="year" name="year" required defaultValue=""><option value="" disabled>Select year</option>{years.map(year => <option value={year} key={year}>{year}</option>)}</select></div><div className="field"><label htmlFor="modelName">Model</label><input id="modelName" name="modelName" list="mercedes-models" required maxLength={120} placeholder="Search or type a model" autoComplete="off"/><datalist id="mercedes-models">{models.map(model => <option value={model.name} key={model.id}/>)}</datalist></div><div className="field"><label htmlFor="vin">VIN</label><input id="vin" name="vin" maxLength={17}/></div><div className="field"><label htmlFor="plate">Registration plate</label><input id="plate" name="plate" maxLength={32}/></div><div className="field"><label htmlFor="color">Color</label><input id="color" name="color" maxLength={40}/></div></>}
    </div></section>
    <section className="card"><div className="section-title"><h2>Job order</h2></div><div className="form-grid"><div className="field field-wide"><label htmlFor="complaint">Customer complaint</label><textarea id="complaint" name="complaint" required maxLength={3000}/></div><div className="field"><label htmlFor="technicianId">Assign technician</label><select id="technicianId" name="technicianId"><option value="">Assign later</option>{technicians.map(tech => <option value={tech.id} key={tech.id}>{tech.name}</option>)}</select></div><div className="field"><label htmlFor="templateId">Inspection checklist</label><select id="templateId" name="templateId"><option value="">No checklist</option>{templates.map(template => <option value={template.id} key={template.id}>{template.name}</option>)}</select></div></div></section>
    <div className="row between"><button className="btn btn-primary" type="submit">Create job order</button></div>
  </form>;
}
