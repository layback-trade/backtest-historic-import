import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { MarketStatus } from '../../enterprise/entities/value-objects/market-status'
import { Selection } from '../../enterprise/entities/value-objects/selection'
import { MarketAlreadyClosedError } from '../../enterprise/errors/market-already-closed-error'
import { NewTradeUseCase } from './new-trade'

let sut: NewTradeUseCase
let inMemoryMarketsRepository: InMemoryMarketsRepository

describe('New trade', async () => {
  beforeEach(() => {
    inMemoryMarketsRepository = new InMemoryMarketsRepository()
    sut = new NewTradeUseCase(inMemoryMarketsRepository)
  })

  it('should be able to make a trade', async () => {
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
      odd: 1.25,
      selection: '1',
      timestamp: new Date('2022-04-23T12:08:34Z'),
    })

    expect(inMemoryMarketsRepository.markets.get('1')?.odds).toEqual([
      {
        value: 1.25,
        selection: '1',
        timestamp: new Date('2022-04-23T12:08:34Z'),
      },
    ])
  })

  it('should not be able to make a trade if the market is already closed', async () => {
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
        new MarketStatus('CLOSED', new Date('2022-04-23T20:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      odds: [],
    })

    expect(() =>
      sut.execute({
        marketId: '1',
        odd: 1.25,
        selection: '1',
        timestamp: new Date('2022-04-23T15:08:34Z'), // timestamp before closedAt but closedAt is set
      }),
    ).rejects.toThrowError(MarketAlreadyClosedError)
  })

  it('should not be able to make a trade if the selection does not belong to the market', async () => {
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

    expect(() =>
      sut.execute({
        marketId: '1',
        odd: 1.25,
        selection: '55',
        timestamp: new Date('2022-04-23T12:08:34Z'),
      }),
    ).rejects.toThrowError('Selection does not belongs to this market')
  })

  it('should not be able to make a trade if the odd timestamp is before the market creation date', async () => {
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

    expect(() =>
      sut.execute({
        marketId: '1',
        odd: 1.25,
        selection: '1',
        timestamp: new Date('2022-04-23T11:08:34Z'), // timestamp before createdAt
      }),
    ).rejects.toThrowError('Invalid odd time')
  })
})
