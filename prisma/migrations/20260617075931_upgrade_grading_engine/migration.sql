/*
  Warnings:

  - You are about to drop the column `score` on the `Grade` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Grade" DROP COLUMN "score",
ADD COLUMN     "assignments" JSONB DEFAULT '[]',
ADD COLUMN     "caComputed" DOUBLE PRECISION,
ADD COLUMN     "cats" JSONB DEFAULT '[]',
ADD COLUMN     "examComputed" DOUBLE PRECISION,
ADD COLUMN     "examMax" DOUBLE PRECISION DEFAULT 50,
ADD COLUMN     "examScore" DOUBLE PRECISION,
ADD COLUMN     "finalScore" DOUBLE PRECISION;
