import { InMemoryEventsRepository } from '@/infra/repositories/in-memory/in-memory-events-repository'
import { TurnMarketInPlayUseCase } from './turn-market-in-play'

let sut: TurnMarketInPlayUseCase
let inMemoryEventRepository: InMemoryEventsRepository

describe('Turn market in play', async () => {
  beforeEach(() => {
    inMemoryEventRepository = new InMemoryEventsRepository()
    sut = new TurnMarketInPlayUseCase(inMemoryEventRepository)
  })

  it('should be able to turn a market in play', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['team 1', 'team 2', 'The Draw'],
            type: 'MATCH_ODDS',
            status: 'OPEN',
            createdAt: new Date('2022-04-23T12:00:00Z'),
            odds: [],
          },
        ],
      ]),
    })

    await sut.execute({
      eventId: '1',
      marketId: '1',
      time: new Date('2022-04-23T18:03:00Z'),
    })

    expect(
      inMemoryEventRepository.events.get('1')?.markets.get('1')?.inPlayDate,
    ).toEqual(new Date('2022-04-23T18:03:00Z'))
  })

  /**
   * RULES TO VALIDATE
   * if (this.props.closedAt) {
      throw new Error('Market already closed')
    }
    if (isBefore(time, this.props.createdAt)) {
      throw new Error('Invalid inPlay time')
    }
   */
  it('should not be able to turn a market in play if it is already closed', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['team 1', 'team 2', 'The Draw'],
            type: 'MATCH_ODDS',
            status: 'OPEN',
            createdAt: new Date('2022-04-23T12:00:00Z'),
            closedAt: new Date('2022-04-23T20:00:00Z'),
            odds: [],
          },
        ],
      ]),
    })

    await expect(
      sut.execute({
        eventId: '1',
        marketId: '1',
        time: new Date('2022-04-23T18:03:00Z'),
      }),
    ).rejects.toThrow('Market already closed')
  })

  it('should not be able to turn a market in play if the time is before the market creation', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['team 1', 'team 2', 'The Draw'],
            type: 'MATCH_ODDS',
            status: 'OPEN',
            createdAt: new Date('2022-04-23T12:00:00Z'),
            odds: [],
          },
        ],
      ]),
    })

    await expect(
      sut.execute({
        eventId: '1',
        marketId: '1',
        time: new Date('2022-04-23T11:59:00Z'),
      }),
    ).rejects.toThrow('Invalid inPlay time')
  })
})
