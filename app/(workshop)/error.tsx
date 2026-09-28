"use client";

import Link from "next/link";

export default function WorkshopError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="content"><section className="card" style={{ maxWidth: 570, margin: "4rem auto" }}><div className="eyebrow">Unable to save</div><h1>Something needs another look.</h1><p className="subtitle mb">Check the form values and current job or stock status, then try again. If the issue continues, contact your administrator.</p><div className="row"><button className="btn btn-primary" onClick={reset}>Try again</button><Link className="btn btn-secondary" href="/dashboard">Go to overview</Link></div></section></main>;
}
