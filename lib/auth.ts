import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma/client";

const COOKIE = "frimps_session";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  return session.user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (user.role !== Role.ADMIN && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export async function assertRole(roles: Role[]) {
  const user = await currentUser();
  if (user?.mustChangePassword) redirect("/change-password");
  if (!user || (user.role !== Role.ADMIN && !roles.includes(user.role))) {
    throw new Error("You are not allowed to perform this action.");
  }
  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + THIRTY_DAYS);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}

export async function canViewJob(jobId: string) {
  const user = await requireUser();
  const job = await db.job.findUnique({ where: { id: jobId }, select: { technicianId: true } });
  if (!job || (user.role === Role.TECHNICIAN && job.technicianId !== user.id)) {
    redirect("/jobs");
  }
  return user;
}
