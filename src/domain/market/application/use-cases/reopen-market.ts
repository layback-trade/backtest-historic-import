import { EventsRepository } from '../repositories/events-repository'

interface ReopenMarketUseCaseProps {
  eventId: string
  marketId: string
}

export class ReopenMarketUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({ eventId, marketId }: ReopenMarketUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    if (!event) {
      throw new Error('Event does not exist!')
    }

    const market = event.getMarketById(marketId)

    market.reopen()

    await this.eventsRepository.save(event)
  }
}
