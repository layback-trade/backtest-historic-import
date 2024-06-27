import { MarketsRepository } from '../repositories/markets-repository'

interface SuspendMarketUseCaseProps {
  marketId: string
  time: Date
}

export class SuspendMarketUseCase {
  constructor(private marketsRepository: MarketsRepository) {}

  async execute({ marketId, time }: SuspendMarketUseCaseProps) {
    const market = await this.marketsRepository.findById(marketId)

    /* v8 ignore next 3 */
    if (!market) {
      throw new Error('Market does not exist!')
    }

    market.suspend(time)

    await this.marketsRepository.save(market)
  }
}
