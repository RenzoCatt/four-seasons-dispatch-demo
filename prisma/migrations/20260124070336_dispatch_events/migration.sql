-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETE', 'CANCELED');

-- CreateTable
CREATE TABLE "DispatchEvent" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "techId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "DispatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DispatchEvent_workOrderId_key" ON "DispatchEvent"("workOrderId");

-- CreateIndex
CREATE INDEX "DispatchEvent_techId_startAt_idx" ON "DispatchEvent"("techId", "startAt");

-- AddForeignKey
ALTER TABLE "DispatchEvent" ADD CONSTRAINT "DispatchEvent_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
