-- CreateEnum
CREATE TYPE "PriceTier" AS ENUM ('STANDARD', 'MEMBER', 'RUMI');

-- CreateTable
CREATE TABLE "PricebookIndustry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricebookIndustry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricebookCategory" (
    "id" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricebookCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricebookItemNew" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricebookItemNew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricebookRateNew" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tier" "PriceTier" NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "hours" DECIMAL(10,2),
    "hourlyRate" DECIMAL(12,2),
    "equipment" DECIMAL(12,2),
    "materialMarkup" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricebookRateNew_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricebookCategory_industryId_idx" ON "PricebookCategory"("industryId");

-- CreateIndex
CREATE INDEX "PricebookCategory_parentId_idx" ON "PricebookCategory"("parentId");

-- CreateIndex
CREATE INDEX "PricebookItemNew_categoryId_idx" ON "PricebookItemNew"("categoryId");

-- CreateIndex
CREATE INDEX "PricebookItemNew_name_idx" ON "PricebookItemNew"("name");

-- CreateIndex
CREATE INDEX "PricebookRateNew_tier_idx" ON "PricebookRateNew"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "PricebookRateNew_itemId_tier_key" ON "PricebookRateNew"("itemId", "tier");

-- AddForeignKey
ALTER TABLE "PricebookCategory" ADD CONSTRAINT "PricebookCategory_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "PricebookIndustry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricebookCategory" ADD CONSTRAINT "PricebookCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PricebookCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricebookItemNew" ADD CONSTRAINT "PricebookItemNew_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PricebookCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricebookRateNew" ADD CONSTRAINT "PricebookRateNew_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PricebookItemNew"("id") ON DELETE CASCADE ON UPDATE CASCADE;
