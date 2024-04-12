import { Event } from '../../enterprise/entities/event'
import { EventsRepository } from '../repositories/events-repository'

interface CreateEventProps {
  id: string
  name: string
  scheduledStartDate: Date
}

export class CreateEventUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({ id, name, scheduledStartDate }: CreateEventProps) {
    const eventAlreadyExists = await this.eventsRepository.findById(id)
    if (eventAlreadyExists) {
      throw new Error('Event already exists!')
    }

    const event = new Event(
      {
        name,
        scheduledStartDate,
      },
      id,
    )

    await this.eventsRepository.create(event)

    return { event }
  }
}
