/*
  Warnings:

  - Made the column `code` on table `PricebookItemNew` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PricebookItemNew" ALTER COLUMN "code" SET NOT NULL;
