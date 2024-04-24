import { ConflictError } from '@/core/errors/conflict-error'
import { InMemoryEventsRepository } from '@/infra/repositories/in-memory/in-memory-events-repository'
import { AddEventMarketUseCase } from './add-event-market'

let sut: AddEventMarketUseCase
let inMemoryEventRepository: InMemoryEventsRepository

describe('Add market for event', async () => {
  beforeEach(() => {
    inMemoryEventRepository = new InMemoryEventsRepository()
    sut = new AddEventMarketUseCase(inMemoryEventRepository)
  })

  it('should be able to add a market for an event', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map(),
    })

    await sut.execute({
      eventId: '1',
      createdAt: new Date('2022-04-23T10:00:00Z'),
      marketId: '1',
      selections: ['1', '2', 'The Draw'],
      type: 'MATCH_ODDS',
    })

    expect(inMemoryEventRepository.events.get('1')).not.toBeNull()
    expect(inMemoryEventRepository.events.get('1')?.markets.get('1')).toEqual(
      expect.objectContaining({
        selections: ['1', '2', 'The Draw'],
        type: 'MATCH_ODDS',
        status: 'OPEN',
        odds: [],
      }),
    )
  })

  it('should not be able to add a market if the market with same type already exists', async () => {
    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets: new Map([
        [
          '1',
          {
            selections: ['1', '2', 'The Draw'],
            type: 'MATCH_ODDS',
            status: 'OPEN',
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

    expect(() =>
      sut.execute({
        eventId: '1',
        createdAt: new Date('2022-04-23T10:00:00Z'),
        marketId: '2',
        selections: ['1', '2', 'The Draw'],
        type: 'MATCH_ODDS',
      }),
    ).rejects.toThrowError(ConflictError)
  })
})
