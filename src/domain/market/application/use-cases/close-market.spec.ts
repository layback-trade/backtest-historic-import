import { InMemoryEventsRepository } from '@/infra/cache/repositories/in-memory-events-repository'
import { CloseMarketUseCase } from './close-market'

let sut: CloseMarketUseCase
let inMemoryEventRepository: InMemoryEventsRepository

describe('Close market', async () => {
  beforeEach(() => {
    inMemoryEventRepository = new InMemoryEventsRepository()
    sut = new CloseMarketUseCase(inMemoryEventRepository)
  })

  it('should be able to close a market', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['1', '2'],
            type: 'MATCH_ODDS',
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
          },
        ],
      ]),
    })

    await sut.execute({
      eventId: '1',
      time: new Date('2022-04-23T20:00:00Z'),
      marketId: '1',
    })

    expect(inMemoryEventRepository.events.get('1')).not.toBeNull()
    expect(inMemoryEventRepository.events.get('1')?.markets.get('1')).toEqual(
      expect.objectContaining({
        closedAt: new Date('2022-04-23T20:00:00Z'),
        status: 'CLOSED',
      }),
    )
  })

  it('should not be able to close a market if the market is already closed', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['1', '2'],
            type: 'MATCH_ODDS',
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
          },
        ],
      ]),
    })

    await expect(
      sut.execute({
        eventId: '1',
        marketId: '1',
        time: new Date('2022-04-23T20:00:00Z'),
      }),
    ).rejects.toThrow('Market already closed')
  })

  it('should not be able to close a market if the market is already closed without inPlayDate', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['1', '2'],
            type: 'MATCH_ODDS',
            status: 'CLOSED',
            createdAt: new Date('2022-04-23T12:00:00Z'),
            odds: [
              {
                value: 1.5,
                timestamp: new Date('2022-04-23T12:00:00Z'),
                selection: '1',
              },
            ],
          },
        ],
      ]),
    })

    await expect(
      sut.execute({
        eventId: '1',
        marketId: '1',
        time: new Date('2022-04-23T20:00:00Z'),
      }),
    ).rejects.toThrow('Market already closed')
  })

  it('should not be able to close a market if the market is already closed without odds', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['1', '2'],
            type: 'MATCH_ODDS',
            status: 'CLOSED',
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
        time: new Date('2022-04-23T20:00:00Z'),
      }),
    ).rejects.toThrow('Market cannot be closed without odds')
  })

  it('should not be able to close a market if it is HALF_TIME and the time is before 45 minutes', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['1', '2'],
            type: 'HALF_TIME',
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
          },
        ],
      ]),
    })

    await expect(
      sut.execute({
        eventId: '1',
        marketId: '1',
        time: new Date('2022-04-23T18:44:59Z'),
      }),
    ).rejects.toThrow('Market cannot be closed before 45 minutes')
  })

  it('should not be able to close a market if it is MATCH_ODDS and the time is before 90 minutes', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['1', '2'],
            type: 'MATCH_ODDS',
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
          },
        ],
      ]),
    })

    await expect(
      sut.execute({
        eventId: '1',
        marketId: '1',
        time: new Date('2022-04-23T18:57:59Z'),
      }),
    ).rejects.toThrow('Market cannot be closed before 90 minutes')
  })

  it('should not be able to close a market if it is CORRECT_SCORE and the time is before 90 minutes', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['1', '2'],
            type: 'CORRECT_SCORE',
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
          },
        ],
      ]),
    })

    await expect(
      sut.execute({
        eventId: '1',
        marketId: '1',
        time: new Date('2022-04-23T18:57:59Z'),
      }),
    ).rejects.toThrow('Market cannot be closed before 90 minutes')
  })
})
