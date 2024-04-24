import { CloseMarketUseCase } from '@/domain/market/application/use-cases/close-market'
import { NewTradeUseCase } from '@/domain/market/application/use-cases/new-trade'
import { ReopenMarketUseCase } from '@/domain/market/application/use-cases/reopen-market'
import { SuspendMarketUseCase } from '@/domain/market/application/use-cases/suspend-market'
import { TurnMarketInPlayUseCase } from '@/domain/market/application/use-cases/turn-market-in-play'
import {
  MarketStatus,
  MarketType,
} from '@/domain/market/enterprise/entities/market'
import { publisher } from '@/infra/start'

export interface MarketDefinition {
  eventId: string
  inPlay: boolean
  eventName: string
  marketType: MarketType
  status: MarketStatus
  runners: {
    id: number
    name: string
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

interface MarketResourceHandlerProps {
  data: FullMarketFile[]
}

const turnMarketInPlayUseCase = new TurnMarketInPlayUseCase(
  publisher.inMemoryEventsRepository,
)
const suspendMarketUseCase = new SuspendMarketUseCase(
  publisher.inMemoryEventsRepository,
)
const reopenMarketUseCase = new ReopenMarketUseCase(
  publisher.inMemoryEventsRepository,
)
const newTradeUseCase = new NewTradeUseCase(publisher.inMemoryEventsRepository)
const closeMarketUseCase = new CloseMarketUseCase(
  publisher.inMemoryEventsRepository,
)

export async function marketResourcesHandler({
  data,
}: MarketResourceHandlerProps) {
  const marketId = data[0].mc[0].id

  if (!data[0].mc[0].marketDefinition) {
    throw new Error('Invalid market definition')
  }

  const { eventId, runners } = data[0].mc[0].marketDefinition

  for (
    let marketDataIndex = 0;
    marketDataIndex < data.length;
    marketDataIndex++
  ) {
    const marketDataUpdate = data[marketDataIndex]
    const { marketDefinition, rc: oddUpdate } = marketDataUpdate.mc[0]
    const timestamp = new Date(marketDataUpdate.pt)
    const event = await publisher.inMemoryEventsRepository.findById(eventId)

    const market = event!.getMarketById(marketId)

    if (!market) {
      console.log({
        eventmarkets: event?.markets,
        marketId,
        event,
        marketDataUpdate,
        pastMarketData: data[marketDataIndex - 1],
      })
    }

    if (marketDefinition) {
      const { inPlay, status } = marketDefinition

      if (!market.inPlayDate && inPlay) {
        await turnMarketInPlayUseCase.execute({
          eventId,
          marketId,
          time: new Date(timestamp),
        })
      }

      switch (status) {
        case 'OPEN':
          if (market.status !== 'OPEN') {
            await reopenMarketUseCase.execute({
              eventId,
              marketId,
            })
          }
          break
        case 'SUSPENDED':
          await suspendMarketUseCase.execute({
            eventId,
            marketId,
            // time: new Date(timestamp),
          })
          break
        case 'CLOSED':
          await closeMarketUseCase.execute({
            eventId,
            marketId,
            time: new Date(timestamp),
          })
          break
      }
    }

    if (oddUpdate && oddUpdate.length > 0) {
      // Should trade if it is more than ten minutes before the event starts?
      for (const { ltp, id } of oddUpdate) {
        await newTradeUseCase.execute({
          eventId: event!.id,
          marketId: market.id,
          selection: runners.find((runner) => runner.id === Number(id))!.name,
          odd: ltp,
          timestamp,
        })
      }
    }
  }
}
