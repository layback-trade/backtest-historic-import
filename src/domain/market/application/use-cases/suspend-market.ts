import { MarketsRepository } from '../repositories/markets-repository'

interface SuspendMarketUseCaseProps {
  marketId: string
}

export class SuspendMarketUseCase {
  constructor(private marketsRepository: MarketsRepository) {}

  async execute({ marketId }: SuspendMarketUseCaseProps) {
    const market = await this.marketsRepository.findById(marketId)

    /* v8 ignore next 3 */
    if (!market) {
      throw new Error('Market does not exist!')
    }

    market.suspend()

    await this.marketsRepository.save(market)
  }
}
