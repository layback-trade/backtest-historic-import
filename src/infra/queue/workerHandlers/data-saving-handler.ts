import {
  inMemoryCompetitionsRepository,
  inMemoryEventsRepository,
  inMemoryMarketsRepository,
  inMemoryMatchesRepository,
  inMemoryTeamsRepository,
} from '@/infra/http/make-instances'
import { PgCopyOdds } from '@/infra/repositories/pg/pg-markets-repository'
import { PrismaMatchMapper } from '@/infra/repositories/prisma/mappers/prisma-match-mapper'
import { OddsSuspender, PrismaOddsMapper } from '@/infra/repositories/prisma/mappers/prisma-odds.mapper'
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

    let statistics: PrismaStatistic[] = []
    const matches: Event[] = []

    inMemoryMarketsRepository.markets.forEach((market, id) => {
      const match = matches.find((m) => m.id === Number(market.eventId))
      const matchIndex = matches.findIndex(
        (m) => m.id === Number(market.eventId),
      )
      if (!match) {
        return null
      }

      if (market.statusHistory.at(-1)!.name !== 'CLOSED') {
        matches.splice(matchIndex, 1)
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
        if (market.statusHistory.at(-1)!.timestamp > match.secondHalfEnd!) {
          match.secondHalfEnd = market.statusHistory.at(-1)!.timestamp
        }

        const home = market.selections[0]
        const away = market.selections[1]
        if(!home || !away) {
          console.log('Sem home ou away', { market })
          return null
        }
        
        teams.push(
          { id: Number(home.id), name: home.name },
          { id: Number(away.id), name: away.name },
        )
        matches.splice(matchIndex, 1, {
          ...match,
          homeTeamId: Number(home.id),
          awayTeamId: Number(away.id),
        })
      }
    })

    inMemoryMatchesRepository.matches.forEach((inMemoryMatch, id) => {
      const event = inMemoryEventsRepository.events.get(id)!

      if (!event) {
        console.log('Sem evento', { matchId: id })
        throw new Error('Sem evento')
      }

      if (!inMemoryMatch.secondHalfStart || !inMemoryMatch.firstHalfEnd) {
        // '33238130', '33239449'
        console.log('Sem first half end ou second half start', {
          match: inMemoryMatch,
        })
        return null
      }

      const { match, statistics: statisticsFormatted } = PrismaMatchMapper.toPersistence({
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
        statistics.filter(statistic => statistic.eventId === Number(market.eventId) && statistic.type === 'GOAL'),
        oddsWithPersistedFormat,
      )

      const oddsWithSuspensions =  oddsSuspender.invalidateAll()
      
      odds.push(...oddsWithSuspensions)
      
      const marketSelections: Selection[] = market.selections.map((selection) =>
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

    const matchesFiltered = matches.filter(
      (match) => {
        if(teams.some((team) => team.id === match.homeTeamId) &&
          teams.some((team) => team.id === match.awayTeamId)) {
          return true
        } else {
          marketsWithMatches = marketsWithMatches.filter((market) => {
            if(market.eventId !== match.id) {
              return true
            }
            selections = selections.filter((selection) => {
              if(selection.marketId !== market.id) {
                return true
              }
              return false
            })
            odds = odds.filter((odd) => odd.marketId !== market.id)
            return false
          })
          return false
        }
      }
    )

    let matchesAdded = 0
    // Aggregate
    console.time("Salvando Dados que não são odds")
    await prisma.$transaction(
      async (tx) => {
        const result = await tx.event.createMany({
          data: matchesFiltered,
          skipDuplicates: true,
        })
        matchesAdded = result.count

        await tx.market.createMany({
          data: marketsWithMatches,
          skipDuplicates: true,
        })

        await Promise.all([
          tx.selection.createMany({
            data: selections,
            skipDuplicates: true,
          }),
          tx.statistic.createMany({
            data: statistics.filter(statistic => matchesFiltered.some(match => match.id === statistic.eventId)),
            skipDuplicates: true,
          }),
        ])
      },
      {
        timeout: 1000 * 60 * 5,
        maxWait: 1000 * 60 * 5,
      },
    )
    console.timeEnd("Salvando Dados que não são odds")

    console.time("Salvando odds")
    await PgCopyOdds.save(odds.filter((odd) => odd.gameTime >= -10))
    console.timeEnd("Salvando odds")

    return { matchesAdded }
  }
}
