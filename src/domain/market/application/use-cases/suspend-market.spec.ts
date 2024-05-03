import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { MarketSuspendedError } from '../../enterprise/errors/market-suspended-error'
import { SuspendMarketUseCase } from './suspend-market'

let sut: SuspendMarketUseCase
let inMemoryMarketsRepository: InMemoryMarketsRepository

describe('Suspend market', async () => {
  beforeEach(() => {
    inMemoryMarketsRepository = new InMemoryMarketsRepository()
    sut = new SuspendMarketUseCase(inMemoryMarketsRepository)
  })

  it('should be able to suspend a market', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      selections: ['team 1', 'team 2', 'The Draw'],
      eventId: '1',
      type: 'MATCH_ODDS',
      status: 'OPEN',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      closedAt: new Date('2022-04-23T20:00:00Z'),
      odds: [],
    })

    await sut.execute({
      marketId: '1',
    })

    expect(inMemoryMarketsRepository.markets.get('1')?.status).toBe('SUSPENDED')
  })

  it('should not be able to suspend a market if it is not open', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      selections: ['team 1', 'team 2', 'The Draw'],
      type: 'MATCH_ODDS',
      status: 'SUSPENDED',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      eventId: '1',
      odds: [],
    })

    await expect(
      sut.execute({
        marketId: '1',
      }),
    ).rejects.toThrow(MarketSuspendedError)
  })
})
