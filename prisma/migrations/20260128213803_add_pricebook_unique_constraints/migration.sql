/*
  Warnings:

  - A unique constraint covering the columns `[industryId,name]` on the table `PricebookCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `PricebookIndustry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[categoryId,code]` on the table `PricebookItemNew` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PricebookCategory_industryId_name_key" ON "PricebookCategory"("industryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PricebookIndustry_name_key" ON "PricebookIndustry"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PricebookItemNew_categoryId_code_key" ON "PricebookItemNew"("categoryId", "code");
