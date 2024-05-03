import { CreateCompetitionUseCase } from '@/domain/match/application/use-cases/create-competition'
import { CreateMatchUseCase } from '@/domain/match/application/use-cases/create-match'
import { CreateTeamUseCase } from '@/domain/match/application/use-cases/create-team'
import { EndMatchFirstHalfUseCase } from '@/domain/match/application/use-cases/end-match-first-half'
import { EndMatchSecondHalfUseCase } from '@/domain/match/application/use-cases/end-match-second-half'
import { RegisterNewMatchStatisticUseCase } from '@/domain/match/application/use-cases/register-new-match-statistic'
import { StartMatchSecondHalfUseCase } from '@/domain/match/application/use-cases/start-match-second-half'
import { IntervalTooShortError } from '@/domain/match/enterprise/errors/Interval-too-short-error'
import { FirstHalfTooLongError } from '@/domain/match/enterprise/errors/first-half-too-long-error'
import { DiscordAlert } from '@/infra/logging/discord'
import { BetsAPIMatchVendor } from '@/infra/match-vendor/betsapi-match-vendor'
import { publisher } from '@/infra/start'
import { Job } from 'bullmq'
import { isAfter, isBefore } from 'date-fns'

const createCompetitionUseCase = new CreateCompetitionUseCase(
  publisher.inMemoryCompetitionsRepository,
)
const createTeamUseCase = new CreateTeamUseCase(
  publisher.inMemoryTeamsRepository,
)
const createMatchUseCase = new CreateMatchUseCase(
  publisher.inMemoryMatchesRepository,
)
const registerNewMatchStatisticUseCase = new RegisterNewMatchStatisticUseCase(
  publisher.inMemoryMatchesRepository,
)
const endMatchFirstHalfUseCase = new EndMatchFirstHalfUseCase(
  publisher.inMemoryMatchesRepository,
)
const startMatchSecondHalfUseCase = new StartMatchSecondHalfUseCase(
  publisher.inMemoryMatchesRepository,
)
const endMatchSecondHalfUseCase = new EndMatchSecondHalfUseCase(
  publisher.inMemoryMatchesRepository,
)

const matchVendor = new BetsAPIMatchVendor()

export interface MarketResourceJobData {
  eventsIdBatch: string[]
}

export async function matchResourcesHandler({
  data,
}: Job<MarketResourceJobData, void, string>) {
  // if(data.eventsIdBatch.length === 0) {
  //   throw new Error('No events to fetch')
  // }
  // if(data.eventsIdBatch.length > 10) {
  //   throw new Error('Too many events to fetch')
  // }

  // Verify if the events exist in the repository

  // call the external service to fetch the events
  const matches = await matchVendor.fetchMatches(data.eventsIdBatch)

  for (const match of matches) {
    await Promise.all([
      createCompetitionUseCase.execute(match.competition),
      createTeamUseCase.execute(match.homeTeam),
      createTeamUseCase.execute(match.awayTeam),
    ])

    await createMatchUseCase.execute({
      awayTeamId: match.awayTeam.id,
      competitionId: match.competition.id,
      homeTeamId: match.homeTeam.id,
      id: match.id,
      firstHalfStart: match.firstHalfStart,
    })

    for (const statistic of match.statistics.filter((stat) =>
      isBefore(stat.timestamp, match.firstHalfEnd),
    )) {
      await registerNewMatchStatisticUseCase.execute({
        matchId: match.id,
        teamSide: statistic.teamSide,
        timestamp: statistic.timestamp,
        type: statistic.type,
        value: statistic.value,
      })
    }

    try {
      await endMatchFirstHalfUseCase.execute({
        id: match.id,
        timestamp: match.firstHalfEnd,
      })

      await startMatchSecondHalfUseCase.execute({
        id: match.id,
        timestamp: match.secondHalfStart,
      })
    } catch (err) {
      if (err instanceof FirstHalfTooLongError) {
        // score_h da betsapi veio referente ao fim do intervalo e não fim do primeiro tempo
        // Ou não veio score_h
        await DiscordAlert.error(`ID da partida: ${match.id} -> ${err.message}`)
      } else if (err) {
        if (err instanceof IntervalTooShortError) {
          await DiscordAlert.error(
            `ID da partida: ${match.id} -> ${err.message}`,
          )
        }
      }
    }
    for (const statistic of match.statistics.filter((stat) =>
      isAfter(stat.timestamp, match.firstHalfEnd),
    )) {
      await registerNewMatchStatisticUseCase.execute({
        matchId: match.id,
        teamSide: statistic.teamSide,
        timestamp: statistic.timestamp,
        type: statistic.type,
        value: statistic.value,
      })
    }
    if (match.secondHalfEnd) {
      await endMatchSecondHalfUseCase.execute({
        id: match.id,
        timestamp: match.secondHalfEnd,
      })
    }
  }
}
