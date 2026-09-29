"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Plus, Pencil, X, Camera } from "lucide-react";
import { updateVehicle } from "@/app/customer-actions";
import { SubmitButton } from "@/components/submit-button";
import { VehicleAvatar } from "@/components/vehicle-avatar";

interface VehicleCardProps {
  vehicle: {
    id: string;
    photoKey?: string | null;
    year: number;
    vin: string | null;
    plate: string | null;
    color: string | null;
    model: { name: string } | null;
    customModel: string | null;
  };
  customerId: string;
  models: { id: string; name: string }[];
  edit: boolean;
}

export function VehicleCard({ vehicle, customerId, models, edit }: VehicleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelName = vehicle.model?.name || vehicle.customModel || "Vehicle";

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCancelEdit = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setIsEditing(false);
  };

  return (
    <div className="card">
      <div className="section-title">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <VehicleAvatar vehicle={vehicle} previewUrl={photoPreview} size={48} />
          <div>
            <span className="eyebrow">Mercedes-Benz · {vehicle.year}</span>
            <h3 style={{ margin: "2px 0 0" }}>{modelName}</h3>
          </div>
        </div>
        <div className="actions">
          <Link
            className="btn btn-primary btn-small"
            href={`/jobs/new?customerId=${customerId}&vehicleId=${vehicle.id}`}
            title="Start new job order for this vehicle"
          >
            <Plus size={14} aria-hidden="true" /> New job
          </Link>
          {edit && (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => {
                if (isEditing) handleCancelEdit();
                else setIsEditing(true);
              }}
              title="Edit vehicle details"
              aria-expanded={isEditing}
            >
              {isEditing ? <X size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      {isEditing && edit ? (
        <form
          action={async (formData: FormData) => {
            await updateVehicle(vehicle.id, formData);
            setIsEditing(false);
          }}
          className="stack mt"
        >
          <div className="form-grid">
            <div>
              <label htmlFor={`year-${vehicle.id}`}>Model year</label>
              <input
                id={`year-${vehicle.id}`}
                name="year"
                type="number"
                min="1926"
                max={new Date().getFullYear() + 1}
                defaultValue={vehicle.year}
                required
              />
            </div>
            <div>
              <label htmlFor={`model-${vehicle.id}`}>Model</label>
              <input
                id={`model-${vehicle.id}`}
                name="modelName"
                list={`models-list-${vehicle.id}`}
                defaultValue={modelName}
                required
              />
              <datalist id={`models-list-${vehicle.id}`}>
                {models.map(m => (
                  <option value={m.name} key={m.id} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor={`vin-${vehicle.id}`}>VIN</label>
              <input
                id={`vin-${vehicle.id}`}
                name="vin"
                maxLength={17}
                defaultValue={vehicle.vin || ""}
                placeholder="17-digit VIN"
              />
            </div>
            <div>
              <label htmlFor={`plate-${vehicle.id}`}>Registration plate</label>
              <input
                id={`plate-${vehicle.id}`}
                name="plate"
                defaultValue={vehicle.plate || ""}
                placeholder="e.g. GE 1234-24"
              />
            </div>
            <div>
              <label htmlFor={`color-${vehicle.id}`}>Color</label>
              <input
                id={`color-${vehicle.id}`}
                name="color"
                defaultValue={vehicle.color || ""}
                placeholder="e.g. Obsidian Black"
              />
            </div>
            <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
              <label htmlFor={`photo-${vehicle.id}`}>Vehicle photo (circular avatar)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                <label
                  htmlFor={`photo-${vehicle.id}`}
                  className="btn btn-secondary btn-small"
                  style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, minHeight: "32px", fontSize: "0.76rem" }}
                >
                  <Camera size={13} aria-hidden="true" />
                  <span>{photoPreview ? "Change photo" : vehicle.photoKey ? "Replace vehicle photo" : "Upload vehicle photo"}</span>
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => {
                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                      setPhotoPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    style={{ color: "#c53030", minHeight: "32px", fontSize: "0.76rem" }}
                  >
                    Clear selection
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  id={`photo-${vehicle.id}`}
                  name="vehiclePhoto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
                <small className="muted" style={{ fontSize: "0.72rem" }}>
                  {photoPreview ? "New photo selected. Click 'Save vehicle' to apply." : "JPG, PNG, or WebP up to 10MB"}
                </small>
              </div>
            </div>
          </div>
          <div className="row">
            <SubmitButton className="btn btn-primary btn-small" pendingLabel="Saving vehicle...">Save vehicle</SubmitButton>
            <button className="btn btn-secondary btn-small" type="button" onClick={handleCancelEdit}>Cancel</button>
          </div>
        </form>
      ) : (
        <dl className="detail-list mt">
          <dt>Plate</dt>
          <dd><strong>{vehicle.plate || "—"}</strong></dd>
          <dt>VIN</dt>
          <dd className="number">{vehicle.vin || "—"}</dd>
          <dt>Color</dt>
          <dd>{vehicle.color || "—"}</dd>
        </dl>
      )}
    </div>
  );
}
