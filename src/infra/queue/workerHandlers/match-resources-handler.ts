import { CreateCompetitionUseCase } from '@/domain/match/application/use-cases/create-competition'
import { CreateMatchUseCase } from '@/domain/match/application/use-cases/create-match'
import { EndMatchFirstHalfUseCase } from '@/domain/match/application/use-cases/end-match-first-half'
import { EndMatchSecondHalfUseCase } from '@/domain/match/application/use-cases/end-match-second-half'
import { RegisterNewMatchStatisticUseCase } from '@/domain/match/application/use-cases/register-new-match-statistic'
import { StartMatchSecondHalfUseCase } from '@/domain/match/application/use-cases/start-match-second-half'
import { IntervalTooShortError } from '@/domain/match/enterprise/errors/Interval-too-short-error'
import { FirstHalfTooLongError } from '@/domain/match/enterprise/errors/first-half-too-long-error'
import { DiscordAlert } from '@/infra/logging/discord'
import { MatchVendor } from '@/infra/match-vendor'

import {
  inMemoryCompetitionsRepository,
  inMemoryMatchesRepository,
} from '@/infra/http/make-instances'
import { Job } from 'bullmq'
import { isAfter, isBefore } from 'date-fns'
import { WorkerHandler } from '../interfaces/worker-handler'

export interface MarketResourcesPayload {
  eventsIdBatch: string[]
}

export class MatchResourcesHandler
  implements WorkerHandler<MarketResourcesPayload>
{
  private createCompetitionUseCase = new CreateCompetitionUseCase(
    inMemoryCompetitionsRepository,
  )

  // private createTeamUseCase = new CreateTeamUseCase(inMemoryTeamsRepository)

  private createMatchUseCase = new CreateMatchUseCase(inMemoryMatchesRepository)

  private registerNewMatchStatisticUseCase =
    new RegisterNewMatchStatisticUseCase(inMemoryMatchesRepository)

  private endMatchFirstHalfUseCase = new EndMatchFirstHalfUseCase(
    inMemoryMatchesRepository,
  )

  private startMatchSecondHalfUseCase = new StartMatchSecondHalfUseCase(
    inMemoryMatchesRepository,
  )

  private endMatchSecondHalfUseCase = new EndMatchSecondHalfUseCase(
    inMemoryMatchesRepository,
  )

  constructor(private matchVendor: MatchVendor) {
    this.process = this.process.bind(this)
  }

  async process({ data }: Job<MarketResourcesPayload>) {
    // if(data.eventsIdBatch.length === 0) {
    //   throw new Error('No events to fetch')
    // }
    // if(data.eventsIdBatch.length > 10) {
    //   throw new Error('Too many events to fetch')
    // }

    // Verify if the events exist in the repository

    // call the external service to fetch the events
    const matches = await this.matchVendor.fetchMatches(data.eventsIdBatch)

    for (const match of matches) {
      if (!match.secondHalfStart || !match.firstHalfEnd) {
        console.log('Sem first half end ou second half start 2', { match })
      }
      await Promise.all([
        this.createCompetitionUseCase.execute(match.competition),
        // this.createTeamUseCase.execute(match.homeTeam),
        // this.createTeamUseCase.execute(match.awayTeam),
      ])

      await this.createMatchUseCase.execute({
        awayTeamId: match.awayTeam.id,
        competitionId: match.competition.id,
        homeTeamId: match.homeTeam.id,
        id: match.id,
        firstHalfStart: match.firstHalfStart,
      })

      for (const statistic of match.statistics.filter((stat) =>
        isBefore(stat.timestamp, match.firstHalfEnd),
      )) {
        await this.registerNewMatchStatisticUseCase.execute({
          matchId: match.id,
          teamSide: statistic.teamSide,
          timestamp: statistic.timestamp,
          type: statistic.type,
          value: statistic.value,
        })
      }

      try {
        if (!match.firstHalfEnd || !match.secondHalfStart) {
          console.log('Sem first half end ou second half start 3', { match })
        }
        await this.endMatchFirstHalfUseCase.execute({
          id: match.id,
          timestamp: match.firstHalfEnd,
        })

        await this.startMatchSecondHalfUseCase.execute({
          id: match.id,
          timestamp: match.secondHalfStart,
        })
      } catch (err) {
        if (err instanceof FirstHalfTooLongError) {
          // score_h da betsapi veio referente ao fim do intervalo e não fim do primeiro tempo
          // Ou não veio score_h
          await DiscordAlert.error(
            `ID da partida: ${match.id} -> ${err.message}`,
          )
        } else if (err) {
          if (err instanceof IntervalTooShortError) {
            await DiscordAlert.error(
              `ID da partida: ${match.id} -> ${err.message}`,
            )
          }
        }
        console.error(err)
      }
      for (const statistic of match.statistics.filter((stat) =>
        isAfter(stat.timestamp, match.firstHalfEnd),
      )) {
        await this.registerNewMatchStatisticUseCase.execute({
          matchId: match.id,
          teamSide: statistic.teamSide,
          timestamp: statistic.timestamp,
          type: statistic.type,
          value: statistic.value,
        })
      }
      if (match.secondHalfEnd) {
        await this.endMatchSecondHalfUseCase.execute({
          id: match.id,
          timestamp: match.secondHalfEnd,
        })
      }
    }
  }
}
