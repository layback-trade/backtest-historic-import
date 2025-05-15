/*
  Warnings:

  - You are about to drop the `Statistic` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

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
