import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

type ModelResult = { Model_Name?: string; Make_Name?: string };
type ApiResult = { Results?: ModelResult[] };
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const response = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/mercedes-benz?format=json", { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Vehicle catalog request failed: HTTP ${response.status}`);
  const data = await response.json() as ApiResult;
  const names = [...new Set((data.Results ?? []).filter(row => row.Make_Name?.toUpperCase().includes("MERCEDES")).map(row => row.Model_Name?.trim()).filter((name): name is string => Boolean(name)))];
  if (!names.length) throw new Error("Vehicle catalog response contained no Mercedes-Benz models.");
  for (const name of names) await db.vehicleModel.upsert({ where: { name }, create: { name }, update: {} });
  console.log(`Imported ${names.length} Mercedes-Benz model names from NHTSA vPIC.`);
}

main().finally(() => db.$disconnect());
