import "server-only";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { UserError } from "@/lib/errors";

export const FLASH_COOKIE = "frimps_flash";

export { UserError };

function prismaCode(error: unknown) {
  return error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
}

const KNOWN_PRISMA_CODES = new Set(["P2034", "P2002", "P2025"]);
function isKnownPrismaError(error: unknown) {
  const code = prismaCode(error);
  return code !== null && KNOWN_PRISMA_CODES.has(code);
}

/** Turns any thrown value into a message that is safe to show. */
export function errorMessage(error: unknown) {
  if (error instanceof UserError) return error.message;
  switch (prismaCode(error)) {
    case "P2034":
      return "Someone else updated this record at the same time. Please try again.";
    case "P2002":
      return "That value is already in use.";
    case "P2025":
      return "That record no longer exists. Refresh the page and try again.";
  }
  console.error(error);
  return "Something went wrong. Check the details and try again.";
}

/**
 * Runs a Serializable transaction and retries it when Postgres reports a
 * serialization conflict (two counters selling at the same moment, etc.).
 */
export async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (error) {
      if (prismaCode(error) !== "P2034" || attempt >= attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * attempt + Math.random() * 50));
    }
  }
}

async function flash(message: string) {
  (await cookies()).set(FLASH_COOKIE, encodeURIComponent(JSON.stringify({ message, at: Date.now() })), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Wraps the body of a form server action. Validation and business-rule errors
 * are shown to the user as a banner instead of being replaced by Next.js's
 * generic production error page. Redirects pass through untouched.
 */
export async function formAction(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    unstable_rethrow(error);
    // Unexpected errors (including permission failures) still go to the error page.
    if (!(error instanceof UserError) && !isKnownPrismaError(error)) throw error;
    await flash(errorMessage(error));
  }
}

/** For actions called from client components: returns the error instead of throwing. */
export async function resultAction<T extends object = object>(fn: () => Promise<T | void>): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    const value = await fn();
    return { ok: true, ...(value || {}) } as { ok: true } & T;
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, error: errorMessage(error) };
  }
}
