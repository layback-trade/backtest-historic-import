import { CloseMarketUseCase } from '@/domain/market/application/use-cases/close-market'
import { NewTradeUseCase } from '@/domain/market/application/use-cases/new-trade'
import { ReopenMarketUseCase } from '@/domain/market/application/use-cases/reopen-market'
import { SuspendMarketUseCase } from '@/domain/market/application/use-cases/suspend-market'
import { TurnMarketInPlayUseCase } from '@/domain/market/application/use-cases/turn-market-in-play'
import {
  MarketStatus,
  MarketType,
} from '@/domain/market/enterprise/entities/market'
import { MarketAlreadyClosedError } from '@/domain/market/enterprise/errors/market-already-closed-error'
import { MarketSuspendedError } from '@/domain/market/enterprise/errors/market-suspended-error'
import { MarketWithoutInPlayDateError } from '@/domain/market/enterprise/errors/market-without-in-play-date-error'
import { MarketWithoutOddsError } from '@/domain/market/enterprise/errors/market-without-odds-error'
import { inMemoryMarketsRepository } from '@/infra/http/make-instances'
import { DiscordAlert } from '@/infra/logging/discord'
import { Job } from 'bullmq'
import { WorkerHandler } from '../interfaces/worker-handler'

export interface MarketDefinition {
  eventId: string
  inPlay: boolean
  eventName: string
  marketType: MarketType
  status: MarketStatus
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
  id: string
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
      const market = await inMemoryMarketsRepository.findById(marketId)

      if (!market) {
        console.log({
          marketId,
          marketDataUpdate,
          pastMarketData: data[marketDataIndex - 1],
        })
        throw new Error('Weirdo')
      }

      if (marketDefinition) {
        const { inPlay, status } = marketDefinition

        if (!market.inPlayDate && inPlay) {
          await this.turnMarketInPlayUseCase.execute({
            marketId,
            time: new Date(timestamp),
          })
        }

        try {
          switch (status) {
            case 'OPEN':
              if (market.status !== 'OPEN') {
                await this.reopenMarketUseCase.execute({
                  marketId,
                })
              }
              break
            case 'SUSPENDED':
              await this.suspendMarketUseCase.execute({
                marketId,
                // time: new Date(timestamp),
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
            DiscordAlert.error(`ID do mercado: ${marketId}; ${err.message}`)
          }
          if (err instanceof MarketAlreadyClosedError) {
            DiscordAlert.error(`ID do mercado: ${marketId}; ${err.message}`)
          }
          if (err instanceof MarketSuspendedError) {
            DiscordAlert.error(`ID do mercado: ${marketId}; ${err.message}`)
          }
          if (err instanceof MarketWithoutInPlayDateError) {
            DiscordAlert.error(`ID do mercado: ${marketId}; ${err.message}`)
          }
        }
      }

      if (oddUpdate && oddUpdate.length > 0) {
        // Should trade if it is more than ten minutes before the event starts?
        try {
          for (const { ltp, id } of oddUpdate) {
            await this.newTradeUseCase.execute({
              marketId: market.id,
              selection: runners.find((runner) => runner.id === Number(id))!
                .name,
              odd: ltp,
              timestamp,
            })
          }
        } catch (err) {
          if (err instanceof MarketAlreadyClosedError) {
            DiscordAlert.error(`ID do mercado: ${marketId}; ${err.message}`)
          }
        }
      }
    }
  }
}
