"use client";

import React from "react";
import { useFormStatus } from "react-dom";

export interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pendingLabel?: string;
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
  disabled,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      className={className}
      {...props}
    >
      {pending && <span className="btn-spinner" aria-hidden="true" />}
      {pending && pendingLabel ? <span>{pendingLabel}</span> : children}
    </button>
  );
}
