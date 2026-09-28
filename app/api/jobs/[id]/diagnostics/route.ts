import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { putPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const expectedOrigin = new URL(process.env.APP_URL || request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin) return new Response("Forbidden origin", { status: 403 });
  const user = await currentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPERVISOR)) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job || job.status === "COMPLETED") return new Response("Job unavailable", { status: 400 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024) return new Response("File must be under 10 MB", { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = bytes.length >= 4 && String.fromCharCode(...bytes.slice(0, 4)) === "%PDF";
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!pdf && !jpeg) return new Response("Only PDF and JPG files are allowed", { status: 400 });
  const contentType = pdf ? "application/pdf" : "image/jpeg";
  const name = file.name.slice(0, 200).replace(/[\\/\r\n]/g, "_") || "diagnostic";
  const objectKey = `diagnostics/${id}/${randomUUID()}.${pdf ? "pdf" : "jpg"}`;
  await putPrivateObject(objectKey, bytes);
  await db.diagnostic.create({ data: { jobId: id, uploadedById: user.id, name, size: file.size, contentType, objectKey } });
  return NextResponse.redirect(new URL(`/jobs/${id}`, request.url), { status: 303 });
}
