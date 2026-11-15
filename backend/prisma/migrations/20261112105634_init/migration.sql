/*
  Warnings:

  - Added the required column `companyId` to the `RateCard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RateCard" ADD COLUMN     "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "RateCard_companyId_idx" ON "RateCard"("companyId");

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
