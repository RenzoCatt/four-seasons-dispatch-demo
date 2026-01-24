/*
  Warnings:

  - A unique constraint covering the columns `[publicToken]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "publicToken" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_publicToken_key" ON "Invoice"("publicToken");
