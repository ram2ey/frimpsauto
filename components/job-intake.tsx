"use client";

import { useState } from "react";
import { UserCheck, Car, Phone, Mail, History, X } from "lucide-react";
import { createJob } from "@/app/job-actions";
import { SubmitButton } from "@/components/submit-button";

type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  _count?: { jobs: number };
  vehicles: {
    id: string;
    year: number;
    model: { name: string } | null;
    customModel: string | null;
    plate: string | null;
    vin: string | null;
    color: string | null;
  }[];
};

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
  const [yearValue, setYearValue] = useState("");

  // Preserve state if user toggles between new and existing customer
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  const currentYear = new Date().getFullYear();
  const commonYears = [
    currentYear,
    currentYear - 1,
    currentYear - 2,
    currentYear - 3,
    currentYear - 5,
    currentYear - 7,
    currentYear - 10,
  ];

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const vehicles = selectedCustomer?.vehicles || [];
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <form action={createJob} className="stack">
      {/* 1. Customer Section */}
      <section className="card">
        <div className="section-title">
          <h2>Customer</h2>
          {selectedCustomer && (
            <span className="pill approved" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <UserCheck size={12} aria-hidden="true" />
              Verified client
            </span>
          )}
        </div>
        <div className="form-grid">
          <div className="field field-wide">
            <label htmlFor="existingCustomerId">Existing customer</label>
            <select
              id="existingCustomerId"
              name="existingCustomerId"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setVehicleId("");
              }}
            >
              <option value="">New customer</option>
              {customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name} · {customer.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Verified Customer Card Preview */}
          {selectedCustomer && (
            <div className="field-wide intake-verified-customer">
              <div className="intake-verified-header">
                <div>
                  <strong style={{ fontSize: "0.95rem", color: "var(--ink)" }}>{selectedCustomer.name}</strong>
                  <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: "0.8rem", color: "var(--muted)", flexWrap: "wrap" }}>
                    <a href={`tel:${selectedCustomer.phone}`} className="text-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Phone size={12} aria-hidden="true" />
                      {selectedCustomer.phone}
                    </a>
                    {selectedCustomer.email && (
                      <a href={`mailto:${selectedCustomer.email}`} className="text-link" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Mail size={12} aria-hidden="true" />
                        {selectedCustomer.email}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    setCustomerId("");
                    setVehicleId("");
                  }}
                  title="Switch to new customer"
                  style={{ minHeight: "30px", padding: "4px 10px", fontSize: "0.72rem" }}
                >
                  <X size={12} aria-hidden="true" />
                  <span>Clear selection</span>
                </button>
              </div>
              <div className="intake-verified-badges">
                <span className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem" }}>
                  <History size={11} aria-hidden="true" />
                  {selectedCustomer._count?.jobs ?? 0} previous {(selectedCustomer._count?.jobs ?? 0) === 1 ? "visit" : "visits"}
                </span>
                <span className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem" }}>
                  <Car size={11} aria-hidden="true" />
                  {vehicles.length} Mercedes {vehicles.length === 1 ? "vehicle" : "vehicles"} on file
                </span>
              </div>
            </div>
          )}

          {/* New Customer Input Fields with state preservation */}
          {!customerId && (
            <>
              <div className="field">
                <label htmlFor="customerName">Full name</label>
                <input
                  id="customerName"
                  name="customerName"
                  required
                  maxLength={120}
                  placeholder="e.g. Kwame Mensah"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="customerPhone">Phone</label>
                <input
                  id="customerPhone"
                  name="customerPhone"
                  required
                  maxLength={50}
                  placeholder="e.g. +233 20 000 0000"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                />
              </div>
              <div className="field field-wide">
                <label htmlFor="customerEmail">Email (optional)</label>
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  placeholder="customer@example.com"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* 2. Vehicle Section */}
      <section className="card">
        <div className="section-title">
          <h2>Vehicle</h2>
          {selectedVehicle && (
            <span className="pill approved" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Car size={12} aria-hidden="true" />
              Existing vehicle
            </span>
          )}
        </div>
        <div className="form-grid">
          {customerId && (
            <div className="field field-wide">
              <label htmlFor="existingVehicleId">Customer vehicles</label>
              <select
                id="existingVehicleId"
                name="existingVehicleId"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">+ Add another vehicle for this customer</option>
                {vehicles.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.year} {v.model?.name || v.customModel} {v.plate ? `· ${v.plate}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected Vehicle Preview Banner */}
          {selectedVehicle && (
            <div className="field-wide intake-verified-vehicle">
              <div>
                <strong style={{ fontSize: "1rem" }}>
                  {selectedVehicle.year} {selectedVehicle.model?.name || selectedVehicle.customModel}
                </strong>
                <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
                  <span>VIN: <strong className="number">{selectedVehicle.vin || "—"}</strong></span>
                  <span>Color: {selectedVehicle.color || "—"}</span>
                </div>
              </div>
              {selectedVehicle.plate && (
                <span className="pill" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, letterSpacing: "0.04em", fontSize: "0.85rem" }}>
                  {selectedVehicle.plate}
                </span>
              )}
            </div>
          )}

          {/* New Vehicle Fields (when no vehicle selected) */}
          {!vehicleId && (
            <>
              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <label htmlFor="year" style={{ margin: 0 }}>Model year</label>
                  <small className="muted" style={{ fontSize: "0.72rem" }}>1926–{currentYear + 1}</small>
                </div>
                <input
                  id="year"
                  name="year"
                  type="number"
                  min="1926"
                  max={currentYear + 1}
                  value={yearValue}
                  onChange={(e) => setYearValue(e.target.value)}
                  placeholder="e.g. 2019"
                  required
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {commonYears.map((yr) => (
                    <button
                      type="button"
                      key={yr}
                      onClick={() => setYearValue(String(yr))}
                      className={`year-preset-btn ${yearValue === String(yr) ? "active" : ""}`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="modelName">Mercedes-Benz model</label>
                <input
                  id="modelName"
                  name="modelName"
                  list="mercedes-models"
                  required
                  maxLength={120}
                  placeholder="Type or select model (e.g. C300, E350)"
                  autoComplete="off"
                />
                <datalist id="mercedes-models">
                  {models.map((model) => (
                    <option value={model.name} key={model.id} />
                  ))}
                </datalist>
              </div>

              <div className="field">
                <label htmlFor="vin">VIN (Chassis number)</label>
                <input
                  id="vin"
                  name="vin"
                  maxLength={17}
                  placeholder="17-character VIN"
                  style={{ textTransform: "uppercase", fontVariantNumeric: "tabular-nums" }}
                />
              </div>

              <div className="field">
                <label htmlFor="plate">Registration plate</label>
                <input
                  id="plate"
                  name="plate"
                  maxLength={32}
                  placeholder="e.g. GE 8492-23"
                  style={{ textTransform: "uppercase", fontVariantNumeric: "tabular-nums" }}
                />
              </div>

              <div className="field">
                <label htmlFor="color">Color</label>
                <input
                  id="color"
                  name="color"
                  maxLength={40}
                  placeholder="e.g. Obsidian Black, Polar White"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* 3. Job Order Details */}
      <section className="card">
        <div className="section-title">
          <h2>Job order</h2>
        </div>
        <div className="form-grid">
          <div className="field field-wide">
            <label htmlFor="complaint">Customer complaint & service requested</label>
            <textarea
              id="complaint"
              name="complaint"
              required
              maxLength={3000}
              placeholder="Describe customer complaints, symptoms, dashboard warning lights, or requested maintenance..."
              style={{ minHeight: "100px" }}
            />
          </div>

          <div className="field">
            <label htmlFor="technicianId">Assign technician</label>
            <select id="technicianId" name="technicianId">
              <option value="">Assign later</option>
              {technicians.map((tech) => (
                <option value={tech.id} key={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="templateId">Inspection checklist</label>
            <select id="templateId" name="templateId">
              <option value="">No checklist</option>
              {templates.map((template) => (
                <option value={template.id} key={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Action Row */}
      <div className="row between">
        <SubmitButton pendingLabel="Creating job order...">Create job order</SubmitButton>
      </div>
    </form>
  );
}
