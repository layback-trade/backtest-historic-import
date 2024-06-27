import { MarketsRepository } from '@/domain/market/application/repositories/markets-repository'
import { Market, MarketType } from '@/domain/market/enterprise/entities/market'
import { MarketStatusType } from '@/domain/market/enterprise/entities/value-objects/market-status'
import { InMemoryMarketMapper } from './mappers/in-memory-market-mapper'

export interface InMemoryPersistenceMarket {
  selections: { name: string; id: string }[]
  type: MarketType
  statusHistory: {
    name: MarketStatusType
    timestamp: Date
  }[]
  createdAt: Date
  inPlayDate?: Date
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

  async createMany(markets: Market[]): Promise<void> {
    markets.forEach((market) => {
      const marketInMemory = InMemoryMarketMapper.toMemory(market)
      this.markets.set(market.id, marketInMemory)
    })
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
