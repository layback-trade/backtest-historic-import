import { Market, MarketType } from '../../enterprise/entities/market'

interface FindByTypeAndEventIdParams {
  type: MarketType
  eventId: string
}

export interface MarketsRepository {
  create(market: Market): Promise<void>
  save(market: Market): Promise<void>
  findById(id: string): Promise<Market | null>
  // findByEventId(eventId: string): Promise<Market[]>
  findByTypeAndEventId(data: FindByTypeAndEventIdParams): Promise<Market | null>
}
