import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { MarketStatus } from '../../enterprise/entities/value-objects/market-status'
import { Selection } from '../../enterprise/entities/value-objects/selection'
import { MarketStatusAlreadyDefinedError } from '../../enterprise/errors/market-status-already-defined-error'
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
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      eventId: '1',
      type: 'MATCH_ODDS',
      statusHistory: [
        new MarketStatus('SUSPENDED', new Date('2022-04-23T12:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      odds: [],
    })

    await sut.execute({
      marketId: '1',
      time: new Date('2022-04-23T12:02:00Z'),
    })

    expect(inMemoryMarketsRepository.markets.get('1')?.statusHistory).toEqual([
      new MarketStatus('SUSPENDED', new Date('2022-04-23T12:00:00Z')),
      new MarketStatus('OPEN', new Date('2022-04-23T12:02:00Z')),
    ])
  })

  it('should not be able to reopen a market if it is not suspended', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      eventId: '1',
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      type: 'MATCH_ODDS',
      statusHistory: [
        new MarketStatus('OPEN', new Date('2022-04-23T12:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      odds: [],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T12:02:00Z'),
      }),
    ).rejects.toThrowError(MarketStatusAlreadyDefinedError)
  })
})
