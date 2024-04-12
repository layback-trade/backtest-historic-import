import { Event } from '../../enterprise/entities/event'
import { EventsRepository } from '../repositories/events-repository'

export class CreateEventUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute(event: Event) {
    const eventAlreadyExists = await this.eventsRepository.findById(event.id)
    if (eventAlreadyExists) {
      throw new Error('Event already exists!')
    }
    await this.eventsRepository.create(event)
  }
}
