/*
  Warnings:

  - Added the required column `companyId` to the `Tyre` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tyre" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Tyre" ADD CONSTRAINT "Tyre_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
