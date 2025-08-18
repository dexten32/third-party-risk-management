/*
  Warnings:

  - You are about to drop the column `originalFileUrl` on the `Summary` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Summary" DROP COLUMN "originalFileUrl";
