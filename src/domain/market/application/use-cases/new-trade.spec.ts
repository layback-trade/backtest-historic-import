import { InMemoryEventsRepository } from '@/infra/repositories/in-memory/in-memory-events-repository'
import { NewTradeUseCase } from './new-trade'

let sut: NewTradeUseCase
let inMemoryEventRepository: InMemoryEventsRepository

describe('New trade', async () => {
  beforeEach(() => {
    inMemoryEventRepository = new InMemoryEventsRepository()
    sut = new NewTradeUseCase(inMemoryEventRepository)
  })

  it('should be able to make a trade', async () => {
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
      odd: 1.25,
      selection: 'team 1',
      timestamp: new Date('2022-04-23T12:08:34Z'),
    })

    expect(
      inMemoryEventRepository.events.get('1')?.markets.get('1')?.odds,
    ).toEqual([
      {
        value: 1.25,
        selection: 'team 1',
        timestamp: new Date('2022-04-23T12:08:34Z'),
      },
    ])
  })

  /*
    RULES TO VALIDATE:
     if (this.props.closedAt) {
      throw new Error('Market already closed')
    }
    if (!this.props.selections.includes(odd.selection)) {
      throw new Error('Selection not belongs to this market')
    }
    if (isBefore(odd.timestamp, this.props.createdAt)) {
      throw new Error('Invalid odd time')
    }
  */

  it('should not be able to make a trade if the market is already closed', async () => {
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
            closedAt: new Date('20222-04-23T20:00:00Z'),
            odds: [],
          },
        ],
      ]),
    })

    expect(() =>
      sut.execute({
        eventId: '1',
        marketId: '1',
        odd: 1.25,
        selection: 'team 1',
        timestamp: new Date('2022-04-23T15:08:34Z'), // timestamp before closedAt but closedAt is set
      }),
    ).rejects.toThrowError('Market already closed')
  })

  it('should not be able to make a trade if the selection does not belong to the market', async () => {
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

    expect(() =>
      sut.execute({
        eventId: '1',
        marketId: '1',
        odd: 1.25,
        selection: 'over 2.5',
        timestamp: new Date('2022-04-23T12:08:34Z'),
      }),
    ).rejects.toThrowError('Selection not belongs to this market')
  })

  it('should not be able to make a trade if the odd timestamp is before the market creation date', async () => {
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

    expect(() =>
      sut.execute({
        eventId: '1',
        marketId: '1',
        odd: 1.25,
        selection: 'team 1',
        timestamp: new Date('2022-04-23T11:08:34Z'), // timestamp before createdAt
      }),
    ).rejects.toThrowError('Invalid odd time')
  })
})
