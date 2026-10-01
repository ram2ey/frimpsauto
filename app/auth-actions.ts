"use server";

import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/client";
import { assertRole, clearSession, createSession, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { text } from "@/lib/format";

function validPassword(password: string) {
  return password.length >= 6 && Buffer.byteLength(password, "utf8") <= 72;
}

function usernameFromForm(value: FormDataEntryValue | null) {
  const username = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    throw new Error("Username must be 3 to 32 characters using letters, numbers, dots, dashes or underscores.");
  }
  return username;
}

export async function login(form: FormData) {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { username } });
  if (!user?.active || !user.passwordHash || !(await compare(password, user.passwordHash))) {
    redirect("/login?error=Invalid%20username%20or%20password");
  }
  await createSession(user.id);
  redirect(
    user.mustChangePassword
      ? "/change-password"
      : user.role === Role.SHOP_STAFF
      ? "/shop"
      : "/dashboard"
  );
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function createStaff(form: FormData) {
  await assertRole([Role.ADMIN]);
  const name = text(form.get("name"), "Name", 100);
  const username = usernameFromForm(form.get("username"));
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role"));
  if (!validPassword(password)) redirect("/team?error=Temporary%20password%20must%20be%20at%20least%206%20characters%20and%20at%20most%2072%20bytes");
  if (!Object.values(Role).includes(role as Role)) throw new Error("Invalid staff role.");
  if (await db.user.findUnique({ where: { username } })) redirect("/team?error=Username%20is%20already%20in%20use");
  await db.user.create({ data: { name, username, passwordHash: await hash(password, 12), role: role as Role, mustChangePassword: true } });
  revalidatePath("/team");
  redirect("/team?created=1");
}

export async function setStaffPassword(userId: string, form: FormData) {
  const actor = await assertRole([Role.ADMIN]);
  if (actor.id === userId) throw new Error("Change your own password from Account.");
  const password = String(form.get("password") ?? "");
  if (!validPassword(password)) redirect("/team?error=Temporary%20password%20must%20be%20at%20least%206%20characters%20and%20at%20most%2072%20bytes");
  const passwordHash = await hash(password, 12);
  await db.$transaction(async tx => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } });
    await tx.session.deleteMany({ where: { userId } });
  });
  revalidatePath("/team");
  redirect("/team?reset=1");
}

export async function changePassword(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const destination = user.mustChangePassword ? "/change-password" : "/account";
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmation = String(form.get("confirmPassword") ?? "");
  if (!user.passwordHash || !(await compare(currentPassword, user.passwordHash))) {
    redirect(`${destination}?error=Current%20password%20is%20incorrect`);
  }
  if (!validPassword(newPassword)) redirect(`${destination}?error=New%20password%20must%20be%20at%20least%206%20characters%20and%20at%20most%2072%20bytes`);
  if (newPassword !== confirmation) redirect(`${destination}?error=Passwords%20do%20not%20match`);
  if (await compare(newPassword, user.passwordHash)) redirect(`${destination}?error=Choose%20a%20different%20password`);
  const passwordHash = await hash(newPassword, 12);
  await db.$transaction(async tx => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
  await createSession(user.id);
  redirect(
    user.mustChangePassword
      ? user.role === Role.SHOP_STAFF
        ? "/shop"
        : "/dashboard"
      : "/account?changed=1"
  );
}

export async function changeUsername(form: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  const currentPassword = String(form.get("currentPassword") ?? "");
  if (!user.passwordHash || !(await compare(currentPassword, user.passwordHash))) redirect("/account?error=Current%20password%20is%20incorrect");
  const username = usernameFromForm(form.get("username"));
  if (username !== user.username) {
    if (await db.user.findUnique({ where: { username } })) redirect("/account?error=Username%20is%20already%20in%20use");
    await db.user.update({ where: { id: user.id }, data: { username } });
  }
  revalidatePath("/account");
  redirect("/account?updated=1");
}

export async function setStaffActive(userId: string, form: FormData) {
  const actor = await assertRole([Role.ADMIN]);
  if (actor.id === userId) throw new Error("You cannot deactivate your own account.");
  const active = form.get("active") === "true";
  await db.user.update({ where: { id: userId }, data: { active } });
  if (!active) await db.session.deleteMany({ where: { userId } });
  revalidatePath("/team");
}

export async function updateStaff(userId: string, form: FormData) {
  const actor = await assertRole([Role.ADMIN]);
  const name = text(form.get("name"), "Name", 100);
  let username: string;
  try {
    username = usernameFromForm(form.get("username"));
  } catch {
    redirect("/team?error=Username%20must%20be%203%20to%2032%20characters%20using%20letters,%20numbers,%20dots,%20dashes%20or%20underscores");
  }

  const role = String(form.get("role"));
  if (!Object.values(Role).includes(role as Role)) {
    throw new Error("Invalid staff role.");
  }

  if (actor.id === userId && role !== Role.ADMIN) {
    redirect("/team?error=You%20cannot%20remove%20your%20own%20Admin%20role");
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing && existing.id !== userId) {
    redirect("/team?error=Username%20is%20already%20in%20use");
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      username,
      role: role as Role,
    },
  });

  revalidatePath("/team");
  redirect("/team?updated=1");
}
