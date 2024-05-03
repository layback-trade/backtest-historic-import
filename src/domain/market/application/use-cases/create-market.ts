import { ConflictError } from '@/core/errors/conflict-error'
import { Market, MarketType } from '../../enterprise/entities/market'
import { EventsRepository } from '../repositories/events-repository'
import { MarketsRepository } from '../repositories/markets-repository'

interface CreateMarketUseCaseProps {
  eventId: string
  type: MarketType
  createdAt: Date
  selections: string[]
  marketId: string
}

export class CreateMarketUseCase {
  constructor(
    private marketsRepository: MarketsRepository,
    private eventsRepository: EventsRepository,
  ) {}

  async execute({
    eventId,
    type,
    createdAt,
    selections,
    marketId,
  }: CreateMarketUseCaseProps) {
    const event = await this.eventsRepository.findById(eventId)

    /* v8 ignore next 3 */
    if (!event) {
      throw new Error('Event does not exist!')
    }

    const marketWithSameTypeAlreadyExists =
      await this.marketsRepository.findByTypeAndEventId({
        eventId,
        type,
      })

    if (marketWithSameTypeAlreadyExists) {
      throw new ConflictError('Market with same type for this event')
    }

    const market = new Market(
      {
        createdAt,
        selections,
        type,
        eventId,
      },
      marketId,
    )

    await this.marketsRepository.save(market)

    return { market }
  }
}
