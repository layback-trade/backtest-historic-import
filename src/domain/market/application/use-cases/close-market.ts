import { EventsRepository } from '../repositories/events-repository'

interface CloseMarketUseCaseProps {
  eventId: string
  marketId: string
  time: Date
}

export class CloseMarketUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({ eventId, marketId, time }: CloseMarketUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    /* v8 ignore next 3 */
    if (!event) {
      throw new Error('Event does not exist!')
    }

    const market = event.getMarketById(marketId)

    market.close(time)

    await this.eventsRepository.save(event)
  }
}
