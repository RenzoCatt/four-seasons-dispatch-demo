-- CreateEnum
CREATE TYPE "PricingTier" AS ENUM ('MEMBER', 'STANDARD', 'RUMI');

-- CreateTable
CREATE TABLE "PriceBookUpload" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" TIMESTAMP(3),

    CONSTRAINT "PriceBookUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBookItem" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "taxableDefault" BOOLEAN NOT NULL DEFAULT true,
    "hours" DECIMAL(10,2),
    "equipment" DECIMAL(10,2),
    "hourlyRate" DECIMAL(10,2),
    "materialMarkUp" DECIMAL(10,2),

    CONSTRAINT "PriceBookItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBookRate" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tier" "PricingTier" NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PriceBookRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceBookItem_uploadId_code_key" ON "PriceBookItem"("uploadId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PriceBookRate_itemId_tier_key" ON "PriceBookRate"("itemId", "tier");

-- AddForeignKey
ALTER TABLE "PriceBookItem" ADD CONSTRAINT "PriceBookItem_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "PriceBookUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBookRate" ADD CONSTRAINT "PriceBookRate_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PriceBookItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
