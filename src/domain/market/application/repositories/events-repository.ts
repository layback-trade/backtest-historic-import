import { Event } from '../../enterprise/entities/event'

export interface EventsRepository {
  findById(id: string): Promise<Event | null>
  create(event: Event): Promise<void>
  save(event: Event): Promise<void>
}
