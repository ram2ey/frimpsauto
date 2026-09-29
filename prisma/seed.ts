import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../generated/prisma/client";
import nhtsaModels from "./nhtsa-models.json";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const models = [
  "170", "180", "190", "200", "220", "230", "240", "250", "260", "280", "300", "320", "350", "380", "420", "450", "500", "560", "600",
  "A-Class", "AMG GT", "B-Class", "C-Class", "CLA", "CLC", "CLK", "CLS", "CL-Class", "CLE", "E-Class", "EQ A", "EQA", "EQB", "EQC", "EQE", "EQS", "G-Class", "GLA", "GLB", "GLC", "GLE", "GLK", "GLS", "GL-Class", "M-Class", "R-Class", "S-Class", "SL", "SLC", "SLK", "SLR McLaren", "SLS AMG", "V-Class", "X-Class",
  "Citan", "eSprinter", "Metris", "Sprinter", "Vaneo", "Vario", "Viano", "Vito", "T-Class",
  "190 E", "190 D", "220 SE", "230 SL", "250 SL", "280 SL", "300 SL", "300 SEL", "300 D", "500 SEC", "500 SL", "560 SEC", "560 SL", "Pagoda", "W123", "W124", "W126", "W201",
];

async function main() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const existingAdmin = await db.user.findFirst({ where: { role: Role.ADMIN } });
  if (!existingAdmin) {
    if (!username || !password) throw new Error("Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD to create the first admin.");
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new Error("BOOTSTRAP_ADMIN_USERNAME must be 3 to 32 characters using letters, numbers, dots, dashes or underscores.");
    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be 12 to 72 bytes.");
    if (await db.user.findUnique({ where: { username } })) throw new Error("BOOTSTRAP_ADMIN_USERNAME is already in use.");
    await db.user.create({ data: { name: "Administrator", username, role: Role.ADMIN, passwordHash: await hash(password, 12), mustChangePassword: true } });
  }
  const startingModels = [...new Set([...models, ...nhtsaModels])];
  for (const name of startingModels) await db.vehicleModel.upsert({ where: { name }, create: { name }, update: {} });
  const template = await db.checklistTemplate.upsert({ where: { name: "General inspection" }, create: { name: "General inspection" }, update: {} });
  const count = await db.checklistTemplateItem.count({ where: { templateId: template.id } });
  if (!count) {
    const labels = ["Exterior and lights", "Tyres and wheels", "Braking system", "Engine and fluid levels", "Transmission", "Steering and suspension", "Battery and charging", "Cabin controls", "Road test", "Fault codes and diagnostics"];
    await db.checklistTemplateItem.createMany({ data: labels.map((label, sortOrder) => ({ templateId: template.id, label, sortOrder })) });
  }
  console.log(`Seeded ${startingModels.length} starting models and the general inspection checklist.`);
}

main().finally(() => db.$disconnect());
