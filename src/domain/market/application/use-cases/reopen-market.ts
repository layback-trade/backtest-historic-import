import { MarketsRepository } from '../repositories/markets-repository'

interface ReopenMarketUseCaseProps {
  marketId: string
  time: Date
}

export class ReopenMarketUseCase {
  constructor(private marketsRepository: MarketsRepository) {}

  async execute({ marketId, time }: ReopenMarketUseCaseProps) {
    const market = await this.marketsRepository.findById(marketId)

    /* v8 ignore next 3 */
    if (!market) {
      throw new Error('Market does not exist!')
    }

    market.reopen(time)

    await this.marketsRepository.save(market)
  }
}
