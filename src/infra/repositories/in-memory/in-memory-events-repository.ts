import { EventsRepository } from '@/domain/market/application/repositories/events-repository'
import { Event } from '@/domain/market/enterprise/entities/event'
import { InMemoryEventMapper } from './mappers/in-memory-event-mapper'

export interface InMemoryPersistenceEvent {
  name: string
  scheduledStartDate: Date
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
