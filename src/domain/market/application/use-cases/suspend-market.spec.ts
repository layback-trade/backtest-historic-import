import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { Selection } from '../../enterprise/entities/value-objects/selection'

import { MarketStatus } from '../../enterprise/entities/value-objects/market-status'
import { MarketStatusAlreadyDefinedError } from '../../enterprise/errors/market-status-already-defined-error'
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
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      eventId: '1',
      type: 'MATCH_ODDS',
      statusHistory: [
        new MarketStatus('OPEN', new Date('2022-04-23T12:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      odds: [],
    })

    await sut.execute({
      marketId: '1',
      time: new Date('2022-04-23T12:08:34Z'),
    })

    expect(
      inMemoryMarketsRepository.markets.get('1')?.statusHistory[1],
    ).toEqual(
      expect.objectContaining({
        name: 'SUSPENDED',
        timestamp: new Date('2022-04-23T12:08:34Z'),
      }),
    )
  })

  it('should not be able to suspend a market if it is not open', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      type: 'MATCH_ODDS',
      statusHistory: [
        new MarketStatus('SUSPENDED', new Date('2022-04-23T12:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      eventId: '1',
      odds: [],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T12:08:34Z'),
      }),
    ).rejects.toThrow(MarketStatusAlreadyDefinedError)
  })
})
