import { EventsRepository } from '@/domain/market/application/repositories/events-repository'
import { Event } from '@/domain/market/enterprise/entities/event'
import {
  MarketStatus,
  MarketType,
} from '@/domain/market/enterprise/entities/market'
import { InMemoryEventMapper } from './mappers/in-memory-event-mapper'

export interface InMemoryPersistenceEvent {
  name: string
  scheduledStartDate: Date
  markets: Map<
    string,
    {
      selections: string[]
      type: MarketType
      status: MarketStatus
      createdAt: Date
      inPlayDate?: Date
      closedAt?: Date
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
    const data = InMemoryEventMapper.toMemory(event)

    this.events.set(event.id, data)
  }

  async save(event: Event): Promise<void> {
    const data = InMemoryEventMapper.toMemory(event)

    this.events.set(event.id, data)
  }

  async findById(id: string) {
    const event = this.events.get(id)
    if (!event) return null

    return InMemoryEventMapper.toDomain({ ...event, id })
  }
}
