import { CloseMarketUseCase } from '@/domain/market/application/use-cases/close-market'
import { NewTradeUseCase } from '@/domain/market/application/use-cases/new-trade'
import { ReopenMarketUseCase } from '@/domain/market/application/use-cases/reopen-market'
import { SuspendMarketUseCase } from '@/domain/market/application/use-cases/suspend-market'
import { TurnMarketInPlayUseCase } from '@/domain/market/application/use-cases/turn-market-in-play'
import { Market, MarketType } from '@/domain/market/enterprise/entities/market'
import { MarketStatusType } from '@/domain/market/enterprise/entities/value-objects/market-status'
import { MarketAlreadyClosedError } from '@/domain/market/enterprise/errors/market-already-closed-error'
import { MarketStatusAlreadyDefinedError } from '@/domain/market/enterprise/errors/market-status-already-defined-error'
import { MarketWithoutInPlayDateError } from '@/domain/market/enterprise/errors/market-without-in-play-date-error'
import { MarketWithoutOddsError } from '@/domain/market/enterprise/errors/market-without-odds-error'
import { CreateTeamUseCase } from '@/domain/match/application/use-cases/create-team'
import {
  inMemoryMarketsRepository,
  inMemoryTeamsRepository,
} from '@/infra/http/make-instances'
import { app } from '@/infra/http/server'
import { Job } from 'bullmq'
import { WorkerHandler } from '../interfaces/worker-handler'

export interface MarketDefinition {
  eventId: string
  inPlay: boolean
  eventName: string
  marketType: MarketType
  status: MarketStatusType
  runners: {
    id: number
    name: string
    status: 'ACTIVE' | 'REMOVED' | 'WINNER' | 'LOSER'
  }[]
  openDate: Date
  settledTime?: Date
}

export interface RunnerChange {
  ltp: number
  id: number
}

export interface MarketItem {
  id: string
  rc?: RunnerChange[]
  marketDefinition?: MarketDefinition
}

export interface FullMarketFile {
  op: string
  mc: MarketItem[]
  pt: number
}

export class MarketResourcesHandler implements WorkerHandler<FullMarketFile[]> {
  private turnMarketInPlayUseCase = new TurnMarketInPlayUseCase(
    inMemoryMarketsRepository,
  )

  private suspendMarketUseCase = new SuspendMarketUseCase(
    inMemoryMarketsRepository,
  )

  private reopenMarketUseCase = new ReopenMarketUseCase(
    inMemoryMarketsRepository,
  )

  private newTradeUseCase = new NewTradeUseCase(inMemoryMarketsRepository)
  private createTeamUseCase = new CreateTeamUseCase(inMemoryTeamsRepository)

  private closeMarketUseCase = new CloseMarketUseCase(inMemoryMarketsRepository)

  constructor() {
    this.process = this.process.bind(this)
  }

  async process({ data }: Job<FullMarketFile[]>) {
    const marketId = data[0].mc[0].id

    if (!data[0].mc[0].marketDefinition) {
      throw new Error('Invalid market definition')
    }

    const { runners } = data[0].mc[0].marketDefinition

    for (
      let marketDataIndex = 0;
      marketDataIndex < data.length;
      marketDataIndex++
    ) {
      const marketDataUpdate = data[marketDataIndex]
      const { marketDefinition, rc: oddUpdate } = marketDataUpdate.mc[0]
      const timestamp = new Date(marketDataUpdate.pt)
      const market = (await inMemoryMarketsRepository.findById(
        marketId,
      )) as Market

      if (!market) {
        return
      }

      if (marketDefinition) {
        const { inPlay, status } = marketDefinition

        if (!market.inPlayDate && inPlay) {
          try {
            await this.turnMarketInPlayUseCase.execute({
              marketId,
              time: new Date(timestamp),
            })
          } catch (err) {
            if (err instanceof MarketAlreadyClosedError) {
              app.log.error(`Market ID: ${marketId}; ${err.message}`)
              break
            }
          }
        }

        if (market.type === 'MATCH_ODDS') {
          const home = {
            id: String(runners[0].id),
            name: runners[0].name,
          }
          const away = {
            id: String(runners[1].id),
            name: runners[1].name,
          }
          await Promise.all([
            this.createTeamUseCase.execute(home),
            this.createTeamUseCase.execute(away),
          ])
        }

        try {
          switch (status) {
            case 'OPEN':
              if (market.status !== 'OPEN') {
                await this.reopenMarketUseCase.execute({
                  marketId,
                  time: new Date(timestamp),
                })
              }
              break
            case 'SUSPENDED':
              await this.suspendMarketUseCase.execute({
                marketId,
                time: new Date(timestamp),
              })
              break
            case 'CLOSED':
              await this.closeMarketUseCase.execute({
                marketId,
                time: new Date(timestamp),
              })
              break
          }
        } catch (err) {
          if (err instanceof MarketWithoutOddsError) {
            app.log.error(`Market ID: ${marketId}; ${err.message}`)
            inMemoryMarketsRepository.markets.delete(marketId)
            break
          }
          if (err instanceof MarketAlreadyClosedError) {
            app.log.error(`Market ID: ${marketId}; ${err.message}`)
          }
          if (err instanceof MarketStatusAlreadyDefinedError) {
            app.log.error(`Market ID: ${marketId}; ${err.message}`)
          }
          if (err instanceof MarketWithoutInPlayDateError) {
            app.log.error(`Market ID: ${marketId}; ${err.message}`)
            inMemoryMarketsRepository.markets.delete(marketId)
            break
          }
        }
      }

      if (oddUpdate && oddUpdate.length > 0) {
        for (const { ltp, id } of oddUpdate) {
          try {
            await this.newTradeUseCase.execute({
              marketId: market.id,
              selection: String(
                runners.find((runner) => runner.id === Number(id))!.id,
              ),
              odd: ltp,
              timestamp,
            })
          } catch (err) {
            if (err instanceof MarketAlreadyClosedError) {
              app.log.error(`Market ID: ${marketId}; ${err.message}`)
            }
            // else if (err instanceof Error) {
            //   app.log.error(`Market ID: ${marketId}; ${err.message}`)
            // }
          }
        }
      }
    }
  }
}
