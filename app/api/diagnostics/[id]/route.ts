import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPrivateObject } from "@/lib/storage";
import { Role } from "@/generated/prisma/client";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const file = await db.diagnostic.findUnique({ where: { id }, include: { job: { select: { technicianId: true } } } });
  if (!file || (user.role === Role.TECHNICIAN && file.job.technicianId !== user.id)) return new Response("Not found", { status: 404 });
  const bytes = await getPrivateObject(file.objectKey);
  if (!bytes) return new Response("File unavailable", { status: 404 });
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": file.contentType,
    "Content-Length": String(file.size),
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
