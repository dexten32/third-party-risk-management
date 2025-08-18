/*
  Warnings:

  - A unique constraint covering the columns `[vendorId]` on the table `Summary` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Summary_vendorId_key" ON "public"."Summary"("vendorId");
