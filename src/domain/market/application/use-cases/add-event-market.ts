import { Market, MarketType } from '../../enterprise/entities/market'
import { EventsRepository } from '../repositories/events-repository'

interface AddEventMarketUseCaseProps {
  eventId: string
  type: MarketType
  createdAt: Date
  selections: string[]
  marketId: string
}

export class AddEventMarketUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({
    eventId,
    type,
    createdAt,
    selections,
    marketId,
  }: AddEventMarketUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    if (!event) {
      throw new Error('Event does not exist!')
    }

    const market = new Market(
      {
        createdAt,
        selections,
        type,
      },
      marketId,
    )

    event.addMarket(market)

    await this.eventsRepository.save(event)

    return { market }
  }
}
