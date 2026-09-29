import { randomUUID } from "node:crypto";
import { currentUser, assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrivateObject, putPrivateObject } from "@/lib/storage";
import { Role } from "@/generated/prisma/client";

export const runtime = "nodejs";

const editors = [Role.SUPERVISOR];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const vehicle = await db.vehicle.findUnique({ where: { id }, select: { photoKey: true } });
  if (!vehicle || !vehicle.photoKey) return new Response("Not found", { status: 404 });
  const bytes = await getPrivateObject(vehicle.photoKey);
  if (!bytes) return new Response("Photo unavailable", { status: 404 });

  let contentType = "image/jpeg";
  if (vehicle.photoKey.endsWith(".png")) contentType = "image/png";
  else if (vehicle.photoKey.endsWith(".webp")) contentType = "image/webp";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await assertRole(editors);
  const { id } = await params;
  const vehicle = await db.vehicle.findUnique({ where: { id } });
  if (!vehicle) return new Response("Vehicle not found", { status: 404 });

  const form = await request.formData();
  const file = (form.get("photo") || form.get("vehiclePhoto")) as File | null;
  if (!file || file.size === 0) return new Response("No image uploaded", { status: 400 });
  if (file.size > 10 * 1024 * 1024) return new Response("Image exceeds 10 MB limit", { status: 400 });

  const mime = file.type.toLowerCase();
  let ext = "jpg";
  if (mime === "image/png") ext = "png";
  else if (mime === "image/webp") ext = "webp";
  else if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
  else return new Response("Only JPEG, PNG, or WebP images are allowed", { status: 400 });

  const key = `vehicles/${id}/${randomUUID()}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());
  await putPrivateObject(key, buffer);
  await db.vehicle.update({ where: { id }, data: { photoKey: key } });

  return Response.json({ success: true, key });
}
