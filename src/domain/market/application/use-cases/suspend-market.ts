import { EventsRepository } from '../repositories/events-repository'

interface SuspendMarketUseCaseProps {
  eventId: string
  marketId: string
}

export class SuspendMarketUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({ eventId, marketId }: SuspendMarketUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    if (!event) {
      throw new Error('Market does not exist!')
    }

    const market = event.getMarketById(marketId)

    market.suspend()

    await this.eventsRepository.save(event)
  }
}
