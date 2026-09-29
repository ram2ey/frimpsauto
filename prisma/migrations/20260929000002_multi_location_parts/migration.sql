-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SHOP_STAFF';

-- CreateEnum
CREATE TYPE "Location" AS ENUM ('WORKSHOP', 'RETAIL_SHOP');

-- AlterTable
ALTER TABLE "Part" ADD COLUMN "shopStockQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "shopReorderLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "location" "Location" NOT NULL DEFAULT 'WORKSHOP';

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "partId" TEXT NOT NULL,
    "fromLocation" "Location" NOT NULL,
    "toLocation" "Location" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectSale" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "location" "Location" NOT NULL DEFAULT 'WORKSHOP',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "totalCents" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCents" INTEGER NOT NULL,

    CONSTRAINT "DirectSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_number_key" ON "StockTransfer"("number");

-- CreateIndex
CREATE INDEX "StockTransfer_fromLocation_toLocation_idx" ON "StockTransfer"("fromLocation", "toLocation");

-- CreateIndex
CREATE UNIQUE INDEX "DirectSale_number_key" ON "DirectSale"("number");

-- CreateIndex
CREATE INDEX "DirectSale_location_createdAt_idx" ON "DirectSale"("location", "createdAt");

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSale" ADD CONSTRAINT "DirectSale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSaleItem" ADD CONSTRAINT "DirectSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "DirectSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectSaleItem" ADD CONSTRAINT "DirectSaleItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
