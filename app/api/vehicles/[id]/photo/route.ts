import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import { deletePrivateObject, getPrivateObject, putPrivateObject, readVehiclePhoto } from "@/lib/storage";
import { Role } from "@/generated/prisma/client";

export const runtime = "nodejs";

const editors: Role[] = [Role.SUPERVISOR];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role === Role.SHOP_STAFF) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const vehicle = await db.vehicle.findUnique({ where: { id }, select: { photoKey: true } });
  if (!vehicle || !vehicle.photoKey) return new Response("Not found", { status: 404 });
  // Technicians only see vehicles they are working on.
  if (user.role === Role.TECHNICIAN && !(await db.job.count({ where: { vehicleId: id, technicianId: user.id } }))) {
    return new Response("Not found", { status: 404 });
  }
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
  const expectedOrigin = new URL(process.env.APP_URL || request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin) return new Response("Forbidden origin", { status: 403 });
  const user = await currentUser();
  if (!user || user.mustChangePassword || !(user.role === Role.ADMIN || editors.includes(user.role))) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const vehicle = await db.vehicle.findUnique({ where: { id } });
  if (!vehicle) return new Response("Vehicle not found", { status: 404 });

  const form = await request.formData();
  let photo;
  try {
    photo = await readVehiclePhoto(form.get("photo") || form.get("vehiclePhoto"));
  } catch (error) {
    if (error instanceof UserError) return new Response(error.message, { status: 400 });
    throw error;
  }
  if (!photo) return new Response("No image uploaded", { status: 400 });

  const key = `vehicles/${id}/${randomUUID()}.${photo.ext}`;
  await putPrivateObject(key, photo.bytes);
  await db.vehicle.update({ where: { id }, data: { photoKey: key } });
  await deletePrivateObject(vehicle.photoKey);

  return Response.json({ success: true, key });
}
