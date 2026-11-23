"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type Props = {
  /** Same-origin URL that returns the PDF (the staff session cookie is sent). */
  url: string;
  filename: string;
  title: string;
  text: string;
  className?: string;
};

function download(file: File) {
  const href = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = href;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/**
 * Opens the device's share sheet (WhatsApp, email, ...) with the PDF attached.
 * Browsers that cannot share files get a normal download instead.
 */
export function SharePdfButton({ url, filename, title, text, className = "btn btn-secondary" }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "tap-again" | "error">("idle");

  async function share(pdf: File) {
    if (!navigator.canShare?.({ files: [pdf] })) {
      download(pdf);
      setState("idle");
      return;
    }
    try {
      await navigator.share({ files: [pdf], title, text });
      setState("idle");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "AbortError") return setState("idle"); // The user closed the share sheet.
      // Some browsers (notably Safari) only allow sharing straight after a tap, and loading
      // the PDF can take too long. The file is ready now, so the next tap shares at once.
      if (name === "NotAllowedError") return setState("tap-again");
      download(pdf);
      setState("idle");
    }
  }

  async function onClick() {
    if (state === "loading") return;
    if (file) return share(file);
    setState("loading");
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`PDF request failed: ${response.status}`);
      const pdf = new File([await response.blob()], filename, { type: "application/pdf" });
      setFile(pdf);
      await share(pdf);
    } catch {
      setState("error");
    }
  }

  const label = state === "loading" ? "Preparing..." : state === "tap-again" ? "Tap again to share" : state === "error" ? "Couldn't load PDF, retry" : "Share";
  return (
    <button type="button" className={className} onClick={onClick} disabled={state === "loading"} aria-live="polite">
      <Share2 size={15} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
