import { MarketsRepository } from '../repositories/markets-repository'

interface TurnMarketInPlayUseCaseProps {
  marketId: string
  time: Date
}

export class TurnMarketInPlayUseCase {
  constructor(private marketsRepository: MarketsRepository) {}

  async execute({ marketId, time }: TurnMarketInPlayUseCaseProps) {
    const market = await this.marketsRepository.findById(marketId)

    /* v8 ignore next 3 */
    if (!market) {
      throw new Error('Market does not exist!')
    }

    market.turnInPlay(time)

    await this.marketsRepository.save(market)
  }
}
