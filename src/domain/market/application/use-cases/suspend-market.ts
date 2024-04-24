import { EventsRepository } from '../repositories/events-repository'

interface SuspendMarketUseCaseProps {
  eventId: string
  marketId: string
}

export class SuspendMarketUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({ eventId, marketId }: SuspendMarketUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    /* v8 ignore next 3 */
    if (!event) {
      throw new Error('Event does not exist!')
    }

    const market = event.getMarketById(marketId)

    market.suspend()

    await this.eventsRepository.save(event)
  }
}
