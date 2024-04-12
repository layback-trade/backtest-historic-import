import { AddEventMarketUseCase } from '@/domain/market/application/use-cases/add-event-market'
import { CloseMarketUseCase } from '@/domain/market/application/use-cases/close-market'
import { CreateEventUseCase } from '@/domain/market/application/use-cases/create-event'
import { NewTradeUseCase } from '@/domain/market/application/use-cases/new-trade'
import { ReopenMarketUseCase } from '@/domain/market/application/use-cases/reopen-market'
import { SuspendMarketUseCase } from '@/domain/market/application/use-cases/suspend-market'
import { TurnMarketInPlayUseCase } from '@/domain/market/application/use-cases/turn-market-in-play'
import {
  MarketStatus,
  MarketType,
} from '@/domain/market/enterprise/entities/market'
import { InMemoryEventsRepository } from '@/infra/cache/repositories/in-memory-events-repository'

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

const inMemoryEventsRepository = new InMemoryEventsRepository()
const createEventUseCase = new CreateEventUseCase(inMemoryEventsRepository)
const addEventMarketUseCase = new AddEventMarketUseCase(
  inMemoryEventsRepository,
)
const turnMarketInPlayUseCase = new TurnMarketInPlayUseCase(
  inMemoryEventsRepository,
)
const suspendMarketUseCase = new SuspendMarketUseCase(inMemoryEventsRepository)
const reopenMarketUseCase = new ReopenMarketUseCase(inMemoryEventsRepository)
const newTradeUseCase = new NewTradeUseCase(inMemoryEventsRepository)
const closeMarketUseCase = new CloseMarketUseCase(inMemoryEventsRepository)

export async function marketResourcesHandler({
  data,
}: MarketResourceHandlerProps) {
  const marketId = data[0].mc[0].id

  if (!data[0].mc[0].marketDefinition) {
    throw new Error('Invalid market definition')
  }

  const { eventId, eventName, marketType, runners, openDate } =
    data[0].mc[0].marketDefinition

  let event = await inMemoryEventsRepository.findById(eventId)
  if (!event) {
    const { event: eventCreated } = await createEventUseCase.execute({
      id: eventId,
      name: eventName,
      scheduledStartDate: openDate,
    })
    event = eventCreated
  }

  await addEventMarketUseCase.execute({
    eventId,
    marketId,
    type: marketType,
    selections: runners.map((runner) => runner.name),
    createdAt: new Date(data[0].pt),
  })

  for (
    let marketDataIndex = 0;
    marketDataIndex < data.length;
    marketDataIndex++
  ) {
    const marketDataUpdate = data[marketDataIndex]
    const { marketDefinition, rc: oddUpdate } = marketDataUpdate.mc[0]
    const timestamp = new Date(marketDataUpdate.pt)
    const market = event.getMarketById(marketId)

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
          if (market.status === 'SUSPENDED') {
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

  return inMemoryEventsRepository.events.size
}
