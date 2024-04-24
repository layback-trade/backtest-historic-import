import { InMemoryEventsRepository } from '@/infra/repositories/in-memory/in-memory-events-repository'
import { SuspendMarketUseCase } from './suspend-market'

let sut: SuspendMarketUseCase
let inMemoryEventRepository: InMemoryEventsRepository

describe('Suspend market', async () => {
  beforeEach(() => {
    inMemoryEventRepository = new InMemoryEventsRepository()
    sut = new SuspendMarketUseCase(inMemoryEventRepository)
  })

  it('should be able to suspend a market', async () => {
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

    await sut.execute({
      eventId: '1',
      marketId: '1',
    })

    expect(
      inMemoryEventRepository.events.get('1')?.markets.get('1')?.status,
    ).toBe('SUSPENDED')
  })

  it('should not be able to suspend a market if it is not open', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['team 1', 'team 2', 'The Draw'],
            type: 'MATCH_ODDS',
            status: 'SUSPENDED',
            createdAt: new Date('2022-04-23T12:00:00Z'),
            odds: [],
          },
        ],
        [
          '2',
          {
            selections: ['team 1', 'team 2', 'The Draw'],
            type: 'HALF_TIME',
            status: 'CLOSED',
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
      }),
    ).rejects.toThrow('Market cannot be suspended if not open')
    await expect(
      sut.execute({
        eventId: '1',
        marketId: '2',
      }),
    ).rejects.toThrow('Market cannot be suspended if not open')
  })
})
