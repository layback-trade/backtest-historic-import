import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { MarketStatus } from '../../enterprise/entities/value-objects/market-status'
import { Selection } from '../../enterprise/entities/value-objects/selection'
import { MarketStatusAlreadyDefinedError } from '../../enterprise/errors/market-status-already-defined-error'
import { MarketWithoutInPlayDateError } from '../../enterprise/errors/market-without-in-play-date-error'
import { CloseMarketUseCase } from './close-market'

let sut: CloseMarketUseCase
let inMemoryMarketRepository: InMemoryMarketsRepository

describe('Close market', async () => {
  beforeEach(() => {
    inMemoryMarketRepository = new InMemoryMarketsRepository()
    sut = new CloseMarketUseCase(inMemoryMarketRepository)
  })

  it('should be able to close a market', async () => {
    inMemoryMarketRepository.markets.set('1', {
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
      inPlayDate: new Date('2022-04-23T18:01:24Z'),
      eventId: '1',
      odds: [
        {
          value: 1.5,
          timestamp: new Date('2022-04-23T12:00:00Z'),
          selection: '1',
        },
      ],
    })

    await sut.execute({
      marketId: '1',
      time: new Date('2022-04-23T20:00:00Z'),
    })

    expect(inMemoryMarketRepository.markets.get('1')).toEqual(
      expect.objectContaining({
        statusHistory: [
          new MarketStatus('OPEN', new Date('2022-04-23T12:00:00Z')),
          new MarketStatus('CLOSED', new Date('2022-04-23T20:00:00Z')),
        ],
      }),
    )
  })

  it('should not be able to close a market if the market is already closed', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      type: 'MATCH_ODDS',
      eventId: '1',
      statusHistory: [
        new MarketStatus('CLOSED', new Date('2022-04-23T12:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      inPlayDate: new Date('2022-04-23T18:01:24Z'),
      odds: [
        {
          value: 1.5,
          timestamp: new Date('2022-04-23T12:00:00Z'),
          selection: '1',
        },
      ],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T20:00:00Z'),
      }),
    ).rejects.toThrow(MarketStatusAlreadyDefinedError)
  })

  it('should not be able to close a market if the market does not have inPlayDate', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      type: 'MATCH_ODDS',
      statusHistory: [
        new MarketStatus('OPEN', new Date('2022-04-23T12:00:00Z')),
      ],
      eventId: '1',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      odds: [
        {
          value: 1.5,
          timestamp: new Date('2022-04-23T12:00:00Z'),
          selection: '1',
        },
      ],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T20:00:00Z'),
      }),
    ).rejects.toThrow(MarketWithoutInPlayDateError)
  })

  it('should not be able to close a market if the market does not have odds', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      eventId: '1',
      type: 'MATCH_ODDS',
      statusHistory: [
        new MarketStatus('CLOSED', new Date('2022-04-23T12:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      odds: [],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T20:00:00Z'),
      }),
    ).rejects.toThrow('Market cannot be closed without odds')
  })

  it.skip('should not be able to close a market if it is HALF_TIME and the time is before 45 minutes', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      type: 'HALF_TIME',
      eventId: '1',
      statusHistory: [
        new MarketStatus('OPEN', new Date('2022-04-23T12:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      inPlayDate: new Date('2022-04-23T18:01:24Z'),
      odds: [
        {
          value: 1.5,
          timestamp: new Date('2022-04-23T12:00:00Z'),
          selection: '1',
        },
      ],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T18:44:59Z'),
      }),
    ).rejects.toThrow('Market cannot be closed before 45 minutes')
  })

  it.skip('should not be able to close a market if it is MATCH_ODDS and the time is before 90 minutes', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: [
        new Selection('1', 'team 1'),
        new Selection('2', 'team 2'),
        new Selection('3', 'The Draw'),
      ],
      type: 'MATCH_ODDS',
      eventId: '1',
      statusHistory: [
        new MarketStatus('OPEN', new Date('2022-04-23T12:00:00Z')),
      ],
      createdAt: new Date('2022-04-23T12:00:00Z'),
      inPlayDate: new Date('2022-04-23T18:01:24Z'),
      odds: [
        {
          value: 1.5,
          timestamp: new Date('2022-04-23T12:00:00Z'),
          selection: '1',
        },
      ],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T18:57:59Z'),
      }),
    ).rejects.toThrow('Market cannot be closed before 90 minutes')
  })

  it.skip('should not be able to close a market if it is CORRECT_SCORE and the time is before 90 minutes', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: [new Selection('1', '00'), new Selection('2', '01')],
      type: 'CORRECT_SCORE',
      statusHistory: [
        new MarketStatus('OPEN', new Date('2022-04-23T12:00:00Z')),
      ],
      eventId: '1',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      inPlayDate: new Date('2022-04-23T18:01:24Z'),
      odds: [
        {
          value: 1.5,
          timestamp: new Date('2022-04-23T12:00:00Z'),
          selection: '1',
        },
      ],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T18:57:59Z'),
      }),
    ).rejects.toThrow('Market cannot be closed before 90 minutes')
  })
})
