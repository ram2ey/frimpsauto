"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

const DEBOUNCE_MS = 300;

/**
 * GET filter form that updates the URL (and so the server-rendered results) while the
 * user types. Text inputs are debounced; selects apply immediately. Pressing Enter still
 * works, and without JavaScript it falls back to a normal form submit.
 */
export function LiveSearchForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [hasValue, setHasValue] = useState(false);

  const apply = () => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }
    setHasValue(params.size > 0);
    const query = params.toString();
    // Page is deliberately dropped: a new search starts from page 1.
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  // Keep fields in sync when the URL changes from elsewhere (back button, pagination),
  // without touching the field the user is typing in.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    let any = false;
    for (const element of Array.from(form.elements)) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement) || !element.name) continue;
      const value = searchParams.get(element.name) ?? "";
      if (value) any = true;
      if (element !== document.activeElement && element.value !== value) element.value = value;
    }
    setHasValue(any);
  }, [searchParams]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const schedule = (immediate: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    if (immediate) apply();
    else timer.current = setTimeout(apply, DEBOUNCE_MS);
  };

  const clear = () => {
    formRef.current?.reset();
    for (const element of Array.from(formRef.current?.elements || [])) {
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) element.value = "";
    }
    schedule(true);
  };

  return (
    <form
      ref={formRef}
      className={className}
      action={pathname}
      method="GET"
      role="search"
      onInput={event => schedule(event.target instanceof HTMLSelectElement)}
      onChange={event => { if (event.target instanceof HTMLSelectElement) schedule(true); }}
      onSubmit={event => { event.preventDefault(); schedule(true); }}
    >
      {children}
      <div className="row" style={{ alignSelf: "end", gap: 8, minHeight: 40, alignItems: "center" }}>
        {hasValue && (
          <button type="button" className="btn btn-secondary" onClick={clear} title="Clear search">
            <X size={15} /> Clear
          </button>
        )}
        <small className="muted" aria-live="polite" style={{ visibility: isPending ? "visible" : "hidden" }}>
          Searching…
        </small>
      </div>
    </form>
  );
}
