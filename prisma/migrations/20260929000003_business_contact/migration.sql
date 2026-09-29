INSERT INTO "BusinessProfile" ("id", "name", "address", "phone", "updatedAt")
VALUES ('primary', 'Frimps MB Autoboss', 'Anyah NIC, Accra', '+233543026391', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "address" = EXCLUDED."address",
  "phone" = EXCLUDED."phone",
  "updatedAt" = CURRENT_TIMESTAMP;
