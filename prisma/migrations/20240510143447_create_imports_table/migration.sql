/*
  Warnings:

  - You are about to drop the `Statistic` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "Statistic" DROP CONSTRAINT "Statistic_match_id_fkey";

-- DropTable
DROP TABLE "Statistic";

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ImportStatus" NOT NULL,
    "endedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "specificEventId" TEXT,
    "eventsAdded" INTEGER,
    "totalEvents" INTEGER,
    "totalEventsWithMarket" INTEGER,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistics" (
    "match_id" INTEGER NOT NULL,
    "type" "StatisticType" NOT NULL,
    "team_side" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "opposite_side_value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "staled_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statistics_pkey" PRIMARY KEY ("match_id","type","created_at","team_side")
);

-- AddForeignKey
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
