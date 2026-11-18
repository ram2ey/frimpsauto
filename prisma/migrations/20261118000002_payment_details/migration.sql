-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN "bankName" TEXT,
ADD COLUMN "bankAccountName" TEXT,
ADD COLUMN "bankAccountNumber" TEXT,
ADD COLUMN "bankBranch" TEXT,
ADD COLUMN "momoNumber" TEXT,
ADD COLUMN "momoName" TEXT;

-- Initial payment details (editable later under Business details)
INSERT INTO "BusinessProfile" ("id", "name", "bankName", "bankAccountName", "bankAccountNumber", "momoNumber", "momoName", "updatedAt")
VALUES ('primary', 'Frimps MB Autoboss', 'Ecobank', 'Frimps MB Auto Boss', '1441004763158', '0598556597', 'Konja Ventures', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "bankName" = EXCLUDED."bankName",
  "bankAccountName" = EXCLUDED."bankAccountName",
  "bankAccountNumber" = EXCLUDED."bankAccountNumber",
  "momoNumber" = EXCLUDED."momoNumber",
  "momoName" = EXCLUDED."momoName",
  "updatedAt" = CURRENT_TIMESTAMP;
