"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const COOKIE = "frimps_flash";

function parse(raw: string | undefined) {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as { message?: unknown; at?: unknown };
    return typeof value.message === "string" ? { message: value.message, at: Number(value.at) || 0 } : null;
  } catch {
    return null;
  }
}

/** Shows an error left by a server action (see lib/action.ts) and clears it. */
export function FlashMessage({ raw }: { raw?: string }) {
  const flash = parse(raw);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    if (raw) document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
  }, [raw]);

  if (!flash || dismissedAt === flash.at) return null;
  return (
    <div className="notice flash-message" role="alert" style={{ margin: "16px 24px 0", display: "flex", gap: 12, alignItems: "start" }}>
      <span style={{ flex: 1 }}>{flash.message}</span>
      <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setDismissedAt(flash.at)}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
