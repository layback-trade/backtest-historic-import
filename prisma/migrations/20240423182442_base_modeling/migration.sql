-- CreateEnum
CREATE TYPE "StatisticType" AS ENUM ('GOALS', 'POSSESSION', 'ATTACK', 'CORNER', 'DANGEROUS_ATTACK', 'SUBSTITUTION', 'PENALTY', 'RED_CARD', 'YELLOW_CARD', 'SHOT', 'SHOT_ON_TARGET', 'SHOT_OFF_TARGET');

-- CreateTable
CREATE TABLE "teams" (
    "name" TEXT NOT NULL,
    "id" INTEGER NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cc" TEXT,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "scheduled_start_date" TIMESTAMP(3) NOT NULL,
    "first_half_start" TIMESTAMP(3),
    "second_half_start" TIMESTAMP(3),
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "competition_id" INTEGER NOT NULL,
    "hasStatistics" BOOLEAN NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds" (
    "runner" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "odd" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "staled_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "odds_pkey" PRIMARY KEY ("runner","market_id","created_at")
);

-- CreateTable
CREATE TABLE "Statistic" (
    "match_id" INTEGER NOT NULL,
    "type" "StatisticType" NOT NULL,
    "team_side" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "opposite_side_value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "staled_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Statistic_pkey" PRIMARY KEY ("match_id","type","created_at","team_side")
);

-- CreateIndex
CREATE INDEX "matches_scheduled_start_date_idx" ON "matches"("scheduled_start_date");

-- CreateIndex
CREATE INDEX "markets_type_event_id_idx" ON "markets"("type", "event_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odds" ADD CONSTRAINT "odds_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statistic" ADD CONSTRAINT "Statistic_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
