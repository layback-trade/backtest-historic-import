import { EventsRepository } from '@/domain/market/application/repositories/events-repository'
import { Event } from '@/domain/market/enterprise/entities/event'

export class InMemoryEventsRepository implements EventsRepository {
  public events: Map<string, Event> = new Map()

  async create(event: Event): Promise<void> {
    this.events.set(event.id, event)
  }

  async save(event: Event): Promise<void> {
    this.events.set(event.id, event)
  }

  async findById(id: string): Promise<Event | null> {
    return this.events.get(id) || null
  }
}
