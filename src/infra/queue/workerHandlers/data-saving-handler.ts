import {
  inMemoryCompetitionsRepository,
  inMemoryEventsRepository,
  inMemoryMarketsRepository,
  inMemoryMatchesRepository,
  inMemoryTeamsRepository,
} from '@/infra/http/make-instances'
import { app } from '@/infra/http/server'
import { DiscordAlert } from '@/infra/logging/discord'
import { PgCopyOdds } from '@/infra/repositories/pg/pg-markets-repository'
import { PrismaMatchMapper } from '@/infra/repositories/prisma/mappers/prisma-match-mapper'
import {
  OddsSuspender,
  PrismaOddsMapper,
} from '@/infra/repositories/prisma/mappers/prisma-odds.mapper'
import { PrismaSelectionMapper } from '@/infra/repositories/prisma/mappers/prisma-selections-mapper'
import {
  Event,
  Market,
  PrismaClient,
  Competition as PrismaCompetition,
  Statistic as PrismaStatistic,
  Team as PrismaTeam,
  Selection,
  SelectionOdd,
} from '@prisma/client'
import { WorkerHandler } from '../interfaces/worker-handler'

const prisma = new PrismaClient()

export class DataSavingHandler implements WorkerHandler<null> {
  constructor(/* repositories */) {}

  async process() {
    try {
      // Send notification when import starts
      await DiscordAlert.info('🚀 Data import process started')

      // *** Formatting ***

      const competitions: PrismaCompetition[] = []
      const teams: PrismaTeam[] = []

      inMemoryCompetitionsRepository.competitions.forEach((competition, id) => {
        competitions.push({
          id: Number(id),
          countryId: null,
          name: competition.name,
        })
      })

      inMemoryTeamsRepository.teams.forEach((team, id) => {
        teams.push({
          id: Number(id),
          name: team.name,
        })
      })

      const statistics: PrismaStatistic[] = []
      const matches: Event[] = []
      console.log({
        statisticsCount: statistics.length,
        matchesCount: matches.length,
      })

      inMemoryMarketsRepository.markets.forEach((market) => {
        const match = inMemoryMatchesRepository.matches.get(
          String(market.eventId),
        )
        if (!match) {
          return null
        }

        if (market.statusHistory.at(-1)!.name !== 'CLOSED') {
          inMemoryMatchesRepository.matches.delete(String(market.eventId))
          return null
        }

        if (
          market.type === 'HALF_TIME'
          // market.statusHistory.at(-1)!.timestamp > match.firstHalfEnd!
        ) {
          match.firstHalfEnd = market.statusHistory.at(-1)!.timestamp
        }

        if (market.type === 'MATCH_ODDS') {
          match.firstHalfStart = market.inPlayDate ?? match.firstHalfStart!
          if (
            !match.secondHalfEnd ||
            market.statusHistory.at(-1)!.timestamp > match.secondHalfEnd
          ) {
            match.secondHalfEnd = market.statusHistory.at(-1)!.timestamp
          }

          const home = market.selections[0]
          const away = market.selections[1]
          if (!home || !away) {
            app.log.warn('Match without home or away teams', { market })
            return null
          }

          teams.push(
            { id: Number(home.id), name: home.name },
            { id: Number(away.id), name: away.name },
          )
          inMemoryMatchesRepository.matches.set(String(market.eventId), {
            ...match,
            homeTeamId: home.id,
            awayTeamId: away.id,
          })
        }
      })

      console.log({
        matchesCount: inMemoryMatchesRepository.matches.size,
      })

      inMemoryMatchesRepository.matches.forEach((inMemoryMatch, id) => {
        const event = inMemoryEventsRepository.events.get(id)

        if (!event) {
          app.log.warn('Match without event', {
            match: inMemoryMatch,
            eventsRepository: inMemoryEventsRepository.events,
          })
          return null
        }

        if (!inMemoryMatch.secondHalfStart || !inMemoryMatch.firstHalfEnd) {
          // '33238130', '33239449'
          app.log.warn('Match without first half end or second half start', {
            match: inMemoryMatch,
          })
          return null
        }

        const { match, statistics: statisticsFormatted } =
          PrismaMatchMapper.toPersistence({
            match: {
              ...inMemoryMatch,
              id,
              secondHalfStart: inMemoryMatch.secondHalfStart!,
              firstHalfEnd: inMemoryMatch.firstHalfEnd!,
            },
            event,
          })

        inMemoryMatchesRepository.matches.delete(String(id))
        inMemoryEventsRepository.events.delete(String(id))

        statistics.push(...statisticsFormatted)
        matches.push(match)
      })

      let marketsWithMatches: Market[] = []
      let odds: SelectionOdd[] = []
      let selections: Selection[] = []

      console.log({
        marketsCount: inMemoryMarketsRepository.markets.size,
        matchesCount: matches.length,
      })

      inMemoryMarketsRepository.markets.forEach((market, marketId) => {
        const match = matches.find((m) => m.id === Number(market.eventId))
        if (!match) {
          return null
        }

        const oddsMapper = new PrismaOddsMapper(
          market.odds.map((odd) => ({ ...odd, marketId })),
          {
            firstHalfStart: match.firstHalfStart!,
            firstHalfEnd: match.firstHalfEnd!,
            secondHalfStart: match.secondHalfStart!,
          },
        )

        const oddsWithPersistedFormat = oddsMapper.toPersistence(
          market.statusHistory.at(-1)!.timestamp,
        )

        const oddsSuspender = new OddsSuspender(
          market,
          statistics.filter(
            (statistic) =>
              statistic.eventId === Number(market.eventId) &&
              statistic.type === 'GOAL',
          ),
          oddsWithPersistedFormat,
          {
            firstHalfStart: match.firstHalfStart!,
            firstHalfEnd: match.firstHalfEnd!,
            secondHalfStart: match.secondHalfStart!,
          },
        )

        const oddsWithSuspensions = oddsSuspender.invalidateAll()

        odds.push(...oddsWithSuspensions)

        const marketSelections: Selection[] = market.selections.map(
          (selection) =>
            PrismaSelectionMapper.toPersistence({
              odds: oddsWithPersistedFormat,
              selection,
              marketId,
            }),
        )

        selections.push(...marketSelections)

        marketsWithMatches.push({
          id: marketId,
          eventId: Number(market.eventId),
          type: market.type,
        })
      })

      // *** Saving ***

      console.log({
        competitionsCount: competitions.length,
        teamsCount: teams.length,
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

      console.log({ matchesCount: matches.length })
      const matchesFiltered = matches.filter((match) => {
        if (
          teams.some((team) => team.id === match.homeTeamId) &&
          teams.some((team) => team.id === match.awayTeamId)
        ) {
          return true
        } else {
          marketsWithMatches = marketsWithMatches.filter((market) => {
            if (market.eventId !== match.id) {
              return true
            }
            selections = selections.filter((selection) => {
              if (selection.marketId !== market.id) {
                return true
              }
              return false
            })
            odds = odds.filter((odd) => odd.marketId !== market.id)
            return false
          })
          return false
        }
      })

      let matchesAdded = 0
      // Aggregate
      console.log({
        matchesFilteredCount: matchesFiltered.length,
        matchesCount: matches.length,
      })
      console.time('Salvando Dados que não são odds')
      await prisma.$transaction(
        async (tx) => {
          const result = await tx.event.createMany({
            data: matchesFiltered,
            skipDuplicates: true,
          })

          //     pool.query(`
          //       BEGIN;
          //       INSERT INTO events (
          //         id,
          //         name,
          //         "startDate",
          //         "firstHalfStart",
          //         "firstHalfEnd",
          //         "secondHalfStart",
          //         "secondHalfEnd",
          //         "homeTeamId",
          //         "awayTeamId",
          //         "competitionId",
          //         "homeTeamScore",
          //         "awayTeamScore",
          //         "homeTeamHTScore",
          //         "awayTeamHTScore"
          //       )
          //       VALUES ${matchesFiltered.map((match) => `${match.id}, '${match.name}', '${new Date(match.startDate).toISOString()}', ${match.firstHalfStart ? `'${match.firstHalfStart.toISOString()}'` : 'NULL'}, ${match.firstHalfEnd ? `'${match.firstHalfEnd.toISOString()}'` : 'NULL'}, ${match.secondHalfStart ? `'${match.secondHalfStart.toISOString()}'` : 'NULL'}, ${match.secondHalfEnd ? `'${match.secondHalfEnd.toISOString()}'` : 'NULL'}, ${match.homeTeamId}, ${match.awayTeamId}, ${match.competitionId}, ${match.homeTeamScore}, ${match.awayTeamScore}, ${match.homeTeamHTScore}, ${match.awayTeamHTScore}`).join(', ')}

          //       ROLLBACK;
          //     `)
          //     const count = await tx.$executeRaw`
          //       INSERT INTO events (
          //         id,
          //         name,
          //         "startDate",
          //         "firstHalfStart",
          //         "firstHalfEnd",
          //         "secondHalfStart",
          //         "secondHalfEnd",
          //         "homeTeamId",
          //         "awayTeamId",
          //         "competitionId",
          //         "homeTeamScore",
          //         "awayTeamScore",
          //         "homeTeamHTScore",
          //         "awayTeamHTScore"
          //       )
          //       VALUES ${Prisma.join(
          //         matchesFiltered.map(
          //           (match) => Prisma.sql`(
          //         ${match.id},
          //         ${match.name},
          //         ${new Date(match.startDate).toISOString()}::timestamp with time zone,
          //         ${match.firstHalfStart?.toISOString() ? Prisma.sql`${match.firstHalfStart.toISOString()}::timestamp without time zone` : 'NULL'},
          //         ${match.firstHalfEnd?.toISOString() ? Prisma.sql`${match.firstHalfEnd.toISOString()}::timestamp without time zone` : 'NULL'},
          //         ${match.secondHalfStart?.toISOString() ? Prisma.sql`${match.secondHalfStart.toISOString()}::timestamp with time zone` : 'NULL'},
          //         ${match.secondHalfEnd?.toISOString() ? Prisma.sql`${match.secondHalfEnd.toISOString()}::timestamp without time zone` : Prisma.sql`NULL`},
          //         ${match.homeTeamId},
          //         ${match.awayTeamId},
          //         ${match.competitionId},
          //         ${match.homeTeamScore},
          //         ${match.awayTeamScore},
          //         ${match.homeTeamHTScore},
          //         ${match.awayTeamHTScore}
          //       )`,
          //         ),
          //       )}
          // ON CONFLICT (id)
          //   DO UPDATE SET
          //     name = EXCLUDED.name,
          //     "startDate" = EXCLUDED."startDate",
          //     "firstHalfStart" = EXCLUDED."firstHalfStart",
          //     "firstHalfEnd" = EXCLUDED."firstHalfEnd",
          //     "secondHalfStart" = EXCLUDED."secondHalfStart",
          //     "secondHalfEnd" = EXCLUDED."secondHalfEnd",
          //     "homeTeamId" = EXCLUDED."homeTeamId",
          //     "awayTeamId" = EXCLUDED."awayTeamId",
          //     "competitionId" = EXCLUDED."competitionId",
          //     "homeTeamScore" = EXCLUDED."homeTeamScore",
          //     "awayTeamScore" = EXCLUDED."awayTeamScore",
          //     "homeTeamHTScore" = EXCLUDED."homeTeamHTScore",
          //     "awayTeamHTScore" = EXCLUDED."awayTeamHTScore"
          // -- RETURNING COUNT(*) as count
          //   ;
          //     `

          matchesAdded = result.count

          await tx.market.createMany({
            data: marketsWithMatches,
            skipDuplicates: true,
          })

          console.log({ selectionsCount: selections.length })
          await Promise.all([
            tx.selection.createMany({
              data: selections,
              skipDuplicates: true,
            }),
          ])
          // console log stats
          console.log({
            statisticsCount: statistics.length,
            statisticsFilteredCount: statistics.filter((statistic) =>
              matchesFiltered.some((match) => match.id === statistic.eventId),
            ).length,
          })
          await tx.statistic.createMany({
            data: statistics.filter((statistic) =>
              matchesFiltered.some((match) => match.id === statistic.eventId),
            ),
            skipDuplicates: true,
          })
          console.log({ oddsCount222: odds.length })
        },
        {
          timeout: 1000 * 60 * 5,
          maxWait: 1000 * 60 * 5,
        },
      )
      console.timeEnd('Salvando Dados que não são odds')

      console.log({ oddsCount: odds.length })
      console.time('Salvando odds')
      await PgCopyOdds.save(odds.filter((odd) => odd.gameTime >= -10))
      console.timeEnd('Salvando odds')

      // Send notification when import completes successfully
      await DiscordAlert.info(
        `✅ Data import completed successfully! Added ${matchesAdded} matches with ${odds.length} odds.`,
      )

      return { matchesAdded }
    } catch (error) {
      // Send notification when import fails
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      await DiscordAlert.error(`❌ Data import failed: ${errorMessage}`)
      console.error('Data import error:', error)
      throw error // Re-throw so the queue can handle it appropriately
    }
  }
}
