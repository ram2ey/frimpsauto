-- Keep existing credentials usable: an existing email becomes that account's username.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT "id", lower("email") AS base,
    row_number() OVER (PARTITION BY lower("email") ORDER BY "createdAt", "id") AS position
  FROM "User"
)
UPDATE "User" AS account
SET "username" = CASE WHEN ranked.position = 1 THEN ranked.base ELSE ranked.base || '-' || account."id" END
FROM ranked
WHERE account."id" = ranked."id";

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Invitations are no longer part of staff account creation.
DROP TABLE "Invite";
