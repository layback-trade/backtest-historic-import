import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { ReopenMarketUseCase } from './reopen-market'

let sut: ReopenMarketUseCase
let inMemoryMarketsRepository: InMemoryMarketsRepository

describe('Reopen market', async () => {
  beforeEach(() => {
    inMemoryMarketsRepository = new InMemoryMarketsRepository()
    sut = new ReopenMarketUseCase(inMemoryMarketsRepository)
  })

  it('should be able to reopen a market', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      selections: ['team 1', 'team 2', 'The Draw'],
      eventId: '1',
      type: 'MATCH_ODDS',
      status: 'SUSPENDED',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      closedAt: new Date('2022-04-23T20:00:00Z'),
      odds: [],
    })

    await sut.execute({
      marketId: '1',
    })

    expect(inMemoryMarketsRepository.markets.get('1')?.status).toBe('OPEN')
  })

  it('should not be able to reopen a market if it is not suspended', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      eventId: '1',
      selections: ['team 1', 'team 2', 'The Draw'],
      type: 'MATCH_ODDS',
      status: 'OPEN',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      closedAt: new Date('2022-04-23T20:00:00Z'),
      odds: [],
    })

    await expect(
      sut.execute({
        marketId: '1',
      }),
    ).rejects.toThrow('Market cannot be opened if not suspended')
  })
})
