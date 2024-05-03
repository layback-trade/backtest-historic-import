import { MarketsRepository } from '../repositories/markets-repository'

interface CloseMarketUseCaseProps {
  marketId: string
  time: Date
}

export class CloseMarketUseCase {
  constructor(private marketsRepository: MarketsRepository) {}

  async execute({ marketId, time }: CloseMarketUseCaseProps) {
    const market = await this.marketsRepository.findById(marketId)

    /* v8 ignore next 3 */
    if (!market) {
      throw new Error('Market does not exist!')
    }

    market.close(time)

    await this.marketsRepository.save(market)
  }
}
