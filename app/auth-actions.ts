"use server";

import { compare, hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client";
import { assertRole, clearSession, createSession, hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { text } from "@/lib/format";

export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.active || !user.passwordHash || !(await compare(password, user.passwordHash))) {
    redirect("/login?error=Invalid%20email%20or%20password");
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function inviteStaff(form: FormData) {
  const actor = await assertRole([Role.ADMIN]);
  const name = text(form.get("name"), "Name", 100);
  const email = text(form.get("email"), "Email", 200).toLowerCase();
  const role = String(form.get("role"));
  if (!Object.values(Role).includes(role as Role)) throw new Error("Invalid staff role.");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing?.passwordHash) throw new Error("This staff member already has an account.");
  const user = existing
    ? await db.user.update({ where: { id: existing.id }, data: { name, role: role as Role, active: true } })
    : await db.user.create({ data: { name, email, role: role as Role } });
  const token = randomBytes(32).toString("hex");
  await db.invite.create({
    data: {
      userId: user.id,
      createdById: actor.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });
  revalidatePath("/team");
  redirect(`/team?invite=${token}`);
}

export async function acceptInvite(token: string, form: FormData) {
  const password = String(form.get("password") ?? "");
  if (password.length < 12) redirect(`/invite/${token}?error=Password%20must%20have%20at%20least%2012%20characters`);
  const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date() || !invite.user.active) redirect("/login?error=Invitation%20expired");
  const passwordHash = await hash(password, 12);
  await db.$transaction(async tx => {
    const claimed = await tx.invite.updateMany({ where: { id: invite.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!claimed.count) throw new Error("Invitation expired or already used.");
    await tx.user.update({ where: { id: invite.userId }, data: { passwordHash } });
  });
  await createSession(invite.userId);
  redirect("/dashboard");
}

export async function setStaffActive(userId: string, form: FormData) {
  const actor = await assertRole([Role.ADMIN]);
  if (actor.id === userId) throw new Error("You cannot deactivate your own account.");
  const active = form.get("active") === "true";
  await db.user.update({ where: { id: userId }, data: { active } });
  if (!active) await db.session.deleteMany({ where: { userId } });
  revalidatePath("/team");
}
