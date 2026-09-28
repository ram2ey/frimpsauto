"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateCustomer } from "@/app/customer-actions";
import { SubmitButton } from "@/components/submit-button";

interface CustomerProfileCardProps {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  edit: boolean;
}

export function CustomerProfileCard({
  id,
  name,
  phone,
  email,
  notes,
  edit,
}: CustomerProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <section className="card">
      <div className="section-title">
        <h2>Customer details</h2>
        {edit && (
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setIsEditing(!isEditing)}
            aria-expanded={isEditing}
          >
            {isEditing ? (
              <>
                <X size={14} aria-hidden="true" /> Cancel
              </>
            ) : (
              <>
                <Pencil size={14} aria-hidden="true" /> Edit details
              </>
            )}
          </button>
        )}
      </div>

      {isEditing && edit ? (
        <form
          action={async (formData: FormData) => {
            await updateCustomer(id, formData);
            setIsEditing(false);
          }}
          className="stack mt"
        >
          <div>
            <label htmlFor="customer-name">Full name</label>
            <input id="customer-name" name="name" defaultValue={name} required maxLength={120} />
          </div>
          <div>
            <label htmlFor="customer-phone">Phone</label>
            <input id="customer-phone" name="phone" defaultValue={phone} required maxLength={50} />
          </div>
          <div>
            <label htmlFor="customer-email">Email (optional)</label>
            <input id="customer-email" name="email" type="email" defaultValue={email || ""} maxLength={200} />
          </div>
          <div>
            <label htmlFor="customer-notes">Notes</label>
            <textarea id="customer-notes" name="notes" defaultValue={notes || ""} placeholder="Preferences or customer notes" />
          </div>
          <div className="row">
            <SubmitButton pendingLabel="Saving customer...">Save customer</SubmitButton>
            <button className="btn btn-secondary" type="button" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <dl className="detail-list mt">
          <dt>Name</dt>
          <dd><strong>{name}</strong></dd>
          <dt>Phone</dt>
          <dd>
            <a href={`tel:${phone}`} className="text-link">
              {phone}
            </a>
          </dd>
          <dt>Email</dt>
          <dd>
            {email ? (
              <a href={`mailto:${email}`} className="text-link">
                {email}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt>Notes</dt>
          <dd style={{ whiteSpace: "pre-wrap" }}>{notes || "—"}</dd>
        </dl>
      )}
    </section>
  );
}
