import { Odd } from '../../enterprise/entities/value-objects/odd'
import { EventsRepository } from '../repositories/events-repository'

interface NewTradeUseCaseProps {
  eventId: string
  marketId: string
  selection: string
  timestamp: Date
  odd: number
}

export class NewTradeUseCase {
  constructor(private eventsRepository: EventsRepository) {}

  async execute({
    eventId,
    marketId,
    selection,
    timestamp,
    odd: oddValue,
  }: NewTradeUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    /* v8 ignore next 3 */
    if (!event) {
      throw new Error('Event does not exist!')
    }

    const market = event.getMarketById(marketId)

    const odd = new Odd({
      selection,
      timestamp,
      value: oddValue,
    })

    market.trade(odd)

    await this.eventsRepository.save(event)
  }
}
