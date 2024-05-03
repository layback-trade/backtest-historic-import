import { Market } from '@/domain/market/enterprise/entities/market'
import { Odd } from '@/domain/market/enterprise/entities/value-objects/odd'
import { InMemoryPersistenceMarket } from '../in-memory-markets-repository'

export class InMemoryMarketMapper {
  static toDomain(market: InMemoryPersistenceMarket & { id: string }): Market {
    const odds = market.odds.map(
      (odd) =>
        new Odd({
          value: odd.value,
          timestamp: odd.timestamp,
          selection: odd.selection,
        }),
    )

    return new Market(
      {
        selections: market.selections,
        type: market.type,
        status: market.status,
        odds,
        createdAt: market.createdAt,
        closedAt: market.closedAt,
        inPlayDate: market.inPlayDate,
        eventId: market.eventId,
      },
      market.id,
    )
  }

  static toMemory(market: Market): InMemoryPersistenceMarket {
    const odds = market.odds.map((odd) => ({
      value: odd.value,
      timestamp: odd.timestamp,
      selection: odd.selection,
    }))

    return {
      selections: market.selections,
      type: market.type,
      status: market.status,
      odds,
      inPlayDate: market.inPlayDate,
      closedAt: market.closedAt,
      createdAt: market.createdAt,
      eventId: market.eventId,
    }
  }
}
