import { Event } from '@/domain/market/enterprise/entities/event'
import { Market } from '@/domain/market/enterprise/entities/market'
import { Odd } from '@/domain/market/enterprise/entities/value-objects/odd'
import { InMemoryPersistenceEvent } from '../in-memory-events-repository'

export class InMemoryEventMapper {
  static toDomain(event: InMemoryPersistenceEvent & { id: string }): Event {
    const markets = new Map()
    event.markets.forEach((market, key) => {
      const odds = market.odds.map(
        (odd) =>
          new Odd({
            value: odd.value,
            timestamp: odd.timestamp,
            selection: odd.selection,
          }),
      )

      markets.set(
        key,
        new Market(
          {
            selections: market.selections,
            type: market.type,
            status: market.status,
            odds,
            createdAt: market.createdAt,
            closedAt: market.closedAt,
            inPlayDate: market.inPlayDate,
          },
          key,
        ),
      )
    })

    return new Event(
      {
        name: event!.name,
        scheduledStartDate: event!.scheduledStartDate,
        markets,
      },
      event.id,
    )
  }

  static toMemory(event: Event): InMemoryPersistenceEvent {
    const markets = new Map()
    event.markets.forEach((market, key) => {
      const odds = market.odds.map((odd) => ({
        value: odd.value,
        timestamp: odd.timestamp,
        selection: odd.selection,
      }))

      markets.set(key, {
        selections: market.selections,
        type: market.type,
        status: market.status,
        odds,
        inPlayDate: market.inPlayDate,
        closedAt: market.closedAt,
      })
    })

    return {
      markets,
      name: event.name,
      scheduledStartDate: event.scheduledStartDate,
    }
  }
}
