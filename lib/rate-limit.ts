import "server-only";
import { headers } from "next/headers";

/**
 * In-memory sign-in throttle. The app runs as a single container (see README),
 * so process memory is enough; move this to Postgres or Redis if you ever run
 * more than one app instance.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 5; // failed attempts per username + IP
const MAX_PER_IP = 30; // failed attempts per IP across all usernames

type Bucket = { count: number; resetAt: number };
const store = (globalThis as unknown as { __frimpsLoginBuckets?: Map<string, Bucket> }).__frimpsLoginBuckets ??= new Map();

function bucket(key: string, now: number) {
  const existing = store.get(key);
  if (existing && existing.resetAt > now) return existing;
  const fresh = { count: 0, resetAt: now + WINDOW_MS };
  store.set(key, fresh);
  return fresh;
}

function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [key, value] of store) if (value.resetAt <= now) store.delete(key);
}

export async function clientIp() {
  const list = await headers();
  // Coolify/Traefik puts the real client first in X-Forwarded-For.
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}

function keys(ip: string, username: string) {
  return [`ip:${ip}`, `acct:${ip}:${username}`] as const;
}

/** Returns the number of minutes to wait, or 0 if a sign-in attempt is allowed. */
export function loginBlockedFor(ip: string, username: string) {
  const now = Date.now();
  const [ipKey, accountKey] = keys(ip, username);
  const ipBucket = bucket(ipKey, now);
  const accountBucket = bucket(accountKey, now);
  const blocked = [ipBucket.count >= MAX_PER_IP ? ipBucket : null, accountBucket.count >= MAX_PER_ACCOUNT ? accountBucket : null]
    .filter((value): value is Bucket => value !== null);
  if (!blocked.length) return 0;
  return Math.ceil((Math.max(...blocked.map(value => value.resetAt)) - now) / 60000);
}

export function recordLoginFailure(ip: string, username: string) {
  const now = Date.now();
  sweep(now);
  for (const key of keys(ip, username)) bucket(key, now).count++;
}

export function clearLoginFailures(ip: string, username: string) {
  store.delete(keys(ip, username)[1]);
}
