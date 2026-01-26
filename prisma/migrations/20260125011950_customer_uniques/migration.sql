/*
  Warnings:

  - A unique constraint covering the columns `[customerId,value]` on the table `CustomerEmail` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customerId,type,value]` on the table `CustomerPhone` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customerId,value]` on the table `CustomerTag` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CustomerEmail_customerId_value_key" ON "CustomerEmail"("customerId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPhone_customerId_type_value_key" ON "CustomerPhone"("customerId", "type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_customerId_value_key" ON "CustomerTag"("customerId", "value");
