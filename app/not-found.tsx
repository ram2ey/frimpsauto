import Link from "next/link";

export default function NotFound() {
  return <main className="content"><section className="card" style={{ maxWidth: 570, margin: "4rem auto" }}><div className="eyebrow">Not found</div><h1>We couldn’t find that record.</h1><p className="subtitle mb">The link may be old or the record may no longer be available.</p><Link className="btn btn-primary" href="/dashboard">Go to overview</Link></section></main>;
}
