"use client";

import { Printer } from "lucide-react";

export function PrintButton({
  label = "Print",
  className = "btn btn-secondary no-print",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.print()}
      title="Print this document"
    >
      <Printer size={15} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
