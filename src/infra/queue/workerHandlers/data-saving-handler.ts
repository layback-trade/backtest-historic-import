import { publisher } from '@/infra/start'
import {
  PrismaClient,
  Competition as PrismaCompetition,
  Market as PrismaMarket,
  Match as PrismaMatch,
  Odd as PrismaOdd,
  Statistic as PrismaStatistic,
  Team as PrismaTeam,
  StatisticType,
} from '@prisma/client'

const prisma = new PrismaClient()

export async function dataSavingHandler() {
  const competitions: PrismaCompetition[] = Array.from(
    publisher.inMemoryCompetitionsRepository.competitions.entries(),
  ).map(([id, competition]) => ({
    id: Number(id),
    cc: competition.cc,
    name: competition.name,
  }))

  const teams: PrismaTeam[] = Array.from(
    publisher.inMemoryTeamsRepository.teams.entries(),
  ).map(([id, team]) => ({
    id: Number(id),
    name: team.name,
  }))

  const statistics: PrismaStatistic[] = []
  const markets: PrismaMarket[] = []
  const odds: PrismaOdd[] = []

  const matches: PrismaMatch[] = Array.from(
    publisher.inMemoryMatchesRepository.matches.entries(),
  ).map(([id, match]) => {
    const event = publisher.inMemoryEventsRepository.events.get(id)!

    const statisticsToPersistence = match.statistics.map((stat) => {
      // get the opposite side value
      const oppositeSideStats = match.statistics.filter(
        (s) =>
          s.teamSide !== stat.teamSide &&
          s.type === stat.type &&
          s.timestamp < stat.timestamp,
      )
      // get staledAt time
      const nextStat = match.statistics.find(
        (s) =>
          s.teamSide === stat.teamSide &&
          s.type === stat.type &&
          s.timestamp > stat.timestamp,
      )
      // verify if stat type is not in the statistictype enum
      if (!Object.values(StatisticType).includes(stat.type as StatisticType)) {
        console.log('here')
      }
      return {
        teamSide: stat.teamSide,
        createdAt: stat.timestamp,
        type: stat.type,
        value: stat.value,
        oppositeSideValue:
          oppositeSideStats.at(-1)?.value ?? stat.type === 'POSSESSION'
            ? 100 - stat.value
            : 0,
        staledAt: nextStat?.timestamp ?? new Date('2050-01-01'),
        matchId: Number(id),
      }
    })

    statistics.push(...statisticsToPersistence)

    const marketsToPersistence = Array.from(event.markets.entries()).map(
      ([marketId, market]) => {
        const marketFormatted: PrismaMarket = {
          id: marketId,
          eventId: Number(id),
          type: market.type,
        }

        const oddsToPersistence = market.odds.map((odd) => {
          const nextOdd = market.odds.find(
            (o) => o.selection === odd.selection && o.timestamp > odd.timestamp,
          )

          const oddFormatted: PrismaOdd = {
            odd: odd.value,
            createdAt: odd.timestamp,
            marketId,
            runner: odd.selection,
            staledAt: nextOdd?.timestamp ?? new Date('2050-01-01'),
          }
          return oddFormatted
        })
        odds.push(...oddsToPersistence)
        return marketFormatted
      },
    )

    markets.push(...marketsToPersistence)
    return {
      id: Number(id),
      name: event.name,
      scheduledStartDate: event.scheduledStartDate,
      awayTeamId: Number(match.awayTeamId),
      competitionId: Number(match.competitionId),
      firstHalfStart: match.firstHalfStart,
      homeTeamId: Number(match.homeTeamId),
      hasStatistics: match.statistics.length > 0,
      // firstHalfEnd: match.firstHalfEnd,
      secondHalfStart: match.secondHalfStart ?? null,
      // secondHalfEnd: match.secondHalfEnd,
    }
  })

  if (competitions.length || teams.length) {
    await Promise.all([
      prisma.competition.createMany({
        data: competitions,
        skipDuplicates: true,
      }),
      prisma.team.createMany({
        data: teams,
        skipDuplicates: true,
      }),
    ])
  }

  // Aggregate
  await prisma.$transaction(async (tx) => {
    await tx.match.createMany({
      data: matches,
      skipDuplicates: true,
    })

    await tx.market.createMany({
      data: markets,
      skipDuplicates: true,
    })

    await Promise.all([
      tx.statistic.createMany({
        data: statistics,
        skipDuplicates: true,
      }),
      tx.odd.createMany({
        data: odds,
        skipDuplicates: true,
      }),
    ])
  })
}
