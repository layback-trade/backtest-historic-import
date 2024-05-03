import { MarketsRepository } from '@/domain/market/application/repositories/markets-repository'
import {
  Market,
  MarketStatus,
  MarketType,
} from '@/domain/market/enterprise/entities/market'
import { InMemoryMarketMapper } from './mappers/in-memory-market-mapper'

export interface InMemoryPersistenceMarket {
  selections: string[]
  type: MarketType
  status: MarketStatus
  createdAt: Date
  inPlayDate?: Date
  closedAt?: Date
  eventId: string
  odds: {
    value: number
    timestamp: Date
    selection: string
  }[]
}

export class InMemoryMarketsRepository implements MarketsRepository {
  public markets: Map<string, InMemoryPersistenceMarket> = new Map()

  async create(market: Market): Promise<void> {
    const marketInMemory = InMemoryMarketMapper.toMemory(market)

    this.markets.set(market.id, marketInMemory)
  }

  async save(market: Market): Promise<void> {
    const marketInMemory = InMemoryMarketMapper.toMemory(market)

    this.markets.set(market.id, marketInMemory)
  }

  async findById(id: string): Promise<Market | null> {
    const market = this.markets.get(id)
    if (!market) return null

    return InMemoryMarketMapper.toDomain({ ...market, id })
  }

  async findByTypeAndEventId({
    eventId,
    type,
  }: {
    eventId: string
    type: MarketType
  }): Promise<Market | null> {
    const marketEntries = this.markets.entries()
    const marketObject = Array.from(marketEntries).find(
      ([, market]) => market.eventId === eventId && market.type === type,
    )

    if (!marketObject) return null

    const [id, market] = marketObject

    return InMemoryMarketMapper.toDomain({ ...market, id })
  }
}
