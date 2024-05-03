import { Event } from '@/domain/market/enterprise/entities/event'
import { InMemoryPersistenceEvent } from '../in-memory-events-repository'

export class InMemoryEventMapper {
  static toDomain(event: InMemoryPersistenceEvent & { id: string }): Event {
    return new Event(
      {
        name: event!.name,
        scheduledStartDate: event!.scheduledStartDate,
      },
      event.id,
    )
  }

  static toMemory(event: Event): InMemoryPersistenceEvent {
    return {
      name: event.name,
      scheduledStartDate: event.scheduledStartDate,
    }
  }
}
