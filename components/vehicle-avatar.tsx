"use client";

import { useState } from "react";
import { Car } from "lucide-react";

interface VehicleAvatarProps {
  vehicle?: {
    id?: string;
    photoKey?: string | null;
    year?: number | null;
    model?: { name: string } | null;
    customModel?: string | null;
    plate?: string | null;
    color?: string | null;
  } | null;
  previewUrl?: string | null;
  size?: number;
  className?: string;
  showBorder?: boolean;
}

export function VehicleAvatar({
  vehicle,
  previewUrl,
  size = 44,
  className = "",
  showBorder = true,
}: VehicleAvatarProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const photoSrc = previewUrl || (vehicle?.id && vehicle.photoKey ? `/api/vehicles/${vehicle.id}/photo` : null);
  const canShowPhoto = Boolean(photoSrc) && !loadFailed;

  const modelName = vehicle?.model?.name || vehicle?.customModel || "Mercedes-Benz";
  const title = vehicle ? `${vehicle.year || ""} ${modelName} ${vehicle.plate ? `(${vehicle.plate})` : ""}`.trim() : "Vehicle";

  return (
    <div
      className={`vehicle-avatar ${className}`.trim()}
      title={title}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #094777 0%, #062f4f 100%)",
        color: "#ffffff",
        border: showBorder ? "2px solid rgba(255, 255, 255, 0.85)" : "none",
        boxShadow: "0 2px 8px rgba(9, 71, 119, 0.18)",
        flexShrink: 0,
      }}
    >
      {canShowPhoto && photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt={title}
          onError={() => setLoadFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
            display: "block",
          }}
        />
      ) : (
        <Car size={Math.round(size * 0.52)} strokeWidth={1.75} aria-hidden="true" />
      )}
    </div>
  );
}
