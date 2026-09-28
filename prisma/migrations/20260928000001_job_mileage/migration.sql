-- Record the odometer reading for each visit, rather than on the vehicle.
ALTER TABLE "Job" ADD COLUMN "mileage" INTEGER;

-- The old vehicle reading, if present, belongs to its most recent visit.
UPDATE "Job" AS job
SET "mileage" = vehicle."mileage"
FROM "Vehicle" AS vehicle
WHERE job."vehicleId" = vehicle."id"
  AND vehicle."mileage" IS NOT NULL
  AND job."id" = (
    SELECT latest."id" FROM "Job" AS latest
    WHERE latest."vehicleId" = vehicle."id"
    ORDER BY latest."createdAt" DESC, latest."number" DESC
    LIMIT 1
  );

ALTER TABLE "Vehicle" DROP COLUMN "mileage";
