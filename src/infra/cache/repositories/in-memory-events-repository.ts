import { EventsRepository } from '@/domain/market/application/repositories/events-repository'
import { Event } from '@/domain/market/enterprise/entities/event'
import { MarketStatus } from '@/domain/market/enterprise/entities/market'

interface InMemoryPersistenceEvent {
  name: string
  scheduledStartDate: Date
  markets: Map<
    string,
    {
      selections: string[]
      type: string
      status: MarketStatus
      odds: {
        value: number
        timestamp: Date
        selection: string
      }[]
    }
  >
}

export class InMemoryEventsRepository implements EventsRepository {
  public events: Map<string, InMemoryPersistenceEvent> = new Map()

  async create(event: Event): Promise<void> {
    this.events.set(event.id, {
      markets: event.markets,
      name: event.name,
      scheduledStartDate: event.scheduledStartDate,
    })
  }

  async save(event: Event): Promise<void> {
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
      })
    })
    this.events.set(event.id, {
      markets,
      name: event.name,
      scheduledStartDate: event.scheduledStartDate,
    })
  }

  async findById(id: string) {
    const event = this.events.get(id)

    return event ? new Event(event, id) : null
  }
}
