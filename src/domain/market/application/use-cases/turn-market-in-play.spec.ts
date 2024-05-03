import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { MarketAlreadyClosedError } from '../../enterprise/errors/market-already-closed-error'
import { TurnMarketInPlayUseCase } from './turn-market-in-play'

let sut: TurnMarketInPlayUseCase
let inMemoryMarketsRepository: InMemoryMarketsRepository

describe('Turn market in play', async () => {
  beforeEach(() => {
    inMemoryMarketsRepository = new InMemoryMarketsRepository()
    sut = new TurnMarketInPlayUseCase(inMemoryMarketsRepository)
  })

  it('should be able to turn a market in play', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      selections: ['team 1', 'team 2', 'The Draw'],
      type: 'MATCH_ODDS',
      eventId: '1',
      status: 'OPEN',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      odds: [],
    })

    await sut.execute({
      marketId: '1',
      time: new Date('2022-04-23T18:03:00Z'),
    })

    expect(inMemoryMarketsRepository.markets.get('1')?.inPlayDate).toEqual(
      new Date('2022-04-23T18:03:00Z'),
    )
  })

  it('should not be able to turn a market in play if it is already closed', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      selections: ['team 1', 'team 2', 'The Draw'],
      type: 'MATCH_ODDS',
      status: 'OPEN',
      eventId: '1',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      closedAt: new Date('2022-04-23T20:00:00Z'),
      odds: [],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T18:03:00Z'),
      }),
    ).rejects.toThrow(MarketAlreadyClosedError)
  })

  it('should not be able to turn a market in play if the time is before the market creation', async () => {
    inMemoryMarketsRepository.markets.set('1', {
      selections: ['team 1', 'team 2', 'The Draw'],
      eventId: '1',
      type: 'MATCH_ODDS',
      status: 'OPEN',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      odds: [],
    })

    await expect(
      sut.execute({
        marketId: '1',
        time: new Date('2022-04-23T11:59:00Z'),
      }),
    ).rejects.toThrow('Invalid inPlay time')
  })
})
