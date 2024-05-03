import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { MarketAlreadyClosedError } from '../../enterprise/errors/market-already-closed-error'
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
      selections: ['1', '2', 'The Draw'],
      type: 'MATCH_ODDS',
      status: 'OPEN',
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
        closedAt: new Date('2022-04-23T20:00:00Z'),
        status: 'CLOSED',
      }),
    )
  })

  it('should not be able to close a market if the market is already closed', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: ['1', '2', 'The Draw'],
      type: 'MATCH_ODDS',
      eventId: '1',
      status: 'CLOSED',
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
    ).rejects.toThrow(MarketAlreadyClosedError)
  })

  it('should not be able to close a market if the market does not have inPlayDate', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: ['1', '2', 'The Draw'],
      type: 'MATCH_ODDS',
      status: 'OPEN',
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
      selections: ['1', '2', 'The Draw'],
      eventId: '1',
      type: 'MATCH_ODDS',
      status: 'CLOSED',
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
      selections: ['1', '2', 'The Draw'],
      type: 'HALF_TIME',
      eventId: '1',
      status: 'OPEN',
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

  it('should not be able to close a market if it is MATCH_ODDS and the time is before 90 minutes', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: ['1', '2', 'The Draw'],
      type: 'MATCH_ODDS',
      eventId: '1',
      status: 'OPEN',
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

  it('should not be able to close a market if it is CORRECT_SCORE and the time is before 90 minutes', async () => {
    inMemoryMarketRepository.markets.set('1', {
      selections: ['1', '2'],
      type: 'CORRECT_SCORE',
      status: 'OPEN',
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
