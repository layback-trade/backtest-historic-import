import { Market } from '../../enterprise/entities/market'
import { EventsRepository } from '../repositories/events-repository'

interface AddEventMarketUseCaseProps {
  eventId: string
  market: Market
}

export class AddEventMarketUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({ eventId, market }: AddEventMarketUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    if (!event) {
      throw new Error('Event does not exist!')
    }

    event.addMarket(market)

    await this.eventsRepository.save(event)
  }
}
