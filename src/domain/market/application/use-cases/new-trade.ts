import { Odd } from '../../enterprise/entities/value-objects/odd'
import { MarketsRepository } from '../repositories/markets-repository'

interface NewTradeUseCaseProps {
  marketId: string
  selection: string
  timestamp: Date
  odd: number
}

export class NewTradeUseCase {
  constructor(private marketsRepository: MarketsRepository) {}

  async execute({
    marketId,
    selection,
    timestamp,
    odd: oddValue,
  }: NewTradeUseCaseProps) {
    const market = await this.marketsRepository.findById(marketId)

    /* v8 ignore next 3 */
    if (!market) {
      throw new Error('Market does not exist!')
    }

    const odd = new Odd({
      selection,
      timestamp,
      value: oddValue,
    })

    market.trade(odd)

    await this.marketsRepository.save(market)
  }
}
