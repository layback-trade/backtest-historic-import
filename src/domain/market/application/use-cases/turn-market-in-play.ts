import { EventsRepository } from '../repositories/events-repository'

interface TurnMarketInPlayUseCaseProps {
  eventId: string
  marketId: string
  time: Date
}

export class TurnMarketInPlayUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({ eventId, marketId, time }: TurnMarketInPlayUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    if (!event) {
      throw new Error('Event does not exist!')
    }

    const market = event.getMarketById(marketId)

    market.turnInPlay(time)

    await this.eventsRepository.save(event)
  }
}
