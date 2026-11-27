"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Download, Share } from "lucide-react";

type Platform = "ios" | "android";
type InstallPromptEvent = Event & {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
};

const standaloneMode = "(display-mode: standalone)";
const InstallAppContext = createContext<((button: HTMLButtonElement) => Promise<void>) | null>(null);

function installPlatform(): Platform | null {
  const device = navigator as Navigator & { standalone?: boolean };
  if (device.standalone || window.matchMedia(standaloneMode).matches) return null;

  const isIPad = device.platform === "MacIntel" && device.maxTouchPoints > 1;
  if (isIPad || /iPhone|iPad|iPod/i.test(device.userAgent)) return "ios";
  return /Android/i.test(device.userAgent) ? "android" : null;
}

function subscribeToDisplayMode(onChange: () => void) {
  const mode = window.matchMedia(standaloneMode);
  mode.addEventListener("change", onChange);
  return () => mode.removeEventListener("change", onChange);
}

export function InstallAppProvider({ children }: { children: ReactNode }) {
  const platform = useSyncExternalStore(subscribeToDisplayMode, installPlatform, () => null);
  const [installed, setInstalled] = useState(false);
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const promptingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function capturePrompt(event: Event) {
      if (installPlatform() !== "android") return;
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
    }

    function onInstall() {
      promptRef.current = null;
      dialogRef.current?.close();
      setInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", onInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstall);
    };
  }, []);

  async function openInstall(button: HTMLButtonElement) {
    if (promptingRef.current) return;
    const prompt = promptRef.current;
    if (platform === "android" && prompt) {
      promptRef.current = null;
      promptingRef.current = true;
      try {
        const { outcome } = await prompt.prompt();
        if (outcome === "accepted") setInstalled(true);
        return;
      } catch {
        // The browser can withdraw its prompt. Show its menu instructions instead.
      } finally {
        promptingRef.current = false;
      }
    }

    triggerRef.current = button;
    dialogRef.current?.showModal();
  }

  return <InstallAppContext.Provider value={platform && !installed ? openInstall : null}>
    {children}
    {platform && <dialog
      ref={dialogRef}
      className="modal-dialog install-app-dialog"
      aria-labelledby="install-app-title"
      onClose={() => triggerRef.current?.focus()}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="modal-card">
        <h2 id="install-app-title">Add Frimps Auto to your Home Screen</h2>
        {platform === "ios" ? <>
          <ol className="install-app-steps">
            <li>Open this page in <strong>Safari</strong>.</li>
            <li>Tap <Share className="install-share-icon" size={17} aria-hidden="true" /> <strong>Share</strong>. If you see a page menu (…), open it first.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</li>
          </ol>
          <p className="install-app-note">If Add to Home Screen is missing, scroll to <strong>Edit Actions</strong> to enable it.</p>
        </> : <ol className="install-app-steps">
          <li>Open this page in <strong>Chrome</strong>.</li>
          <li>Tap the three-dot menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
          <li>Follow the prompt to add the icon.</li>
        </ol>}
        <form method="dialog" className="modal-actions">
          <button type="submit" className="btn btn-primary">Got it</button>
        </form>
      </div>
    </dialog>}
  </InstallAppContext.Provider>;
}

export function InstallAppButton({ className = "" }: { className?: string }) {
  const openInstall = useContext(InstallAppContext);
  if (!openInstall) return null;

  return <button
    type="button"
    className={`btn btn-secondary ${className}`}
    aria-haspopup="dialog"
    onClick={(event) => void openInstall(event.currentTarget)}
  >
    <Download size={16} aria-hidden="true" /> Install app
  </button>;
}
