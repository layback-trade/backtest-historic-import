import { ConflictError } from '@/core/errors/conflict-error'
import { InMemoryEventsRepository } from '@/infra/repositories/in-memory/in-memory-events-repository'
import { InMemoryMarketsRepository } from '@/infra/repositories/in-memory/in-memory-markets-repository'
import { CreateMarketUseCase } from './create-market'

let sut: CreateMarketUseCase
let inMemoryEventsRepository: InMemoryEventsRepository
let inMemoryMarketsRepository: InMemoryMarketsRepository

describe('Add market for event', async () => {
  beforeEach(() => {
    inMemoryEventsRepository = new InMemoryEventsRepository()
    inMemoryMarketsRepository = new InMemoryMarketsRepository()
    sut = new CreateMarketUseCase(
      inMemoryMarketsRepository,
      inMemoryEventsRepository,
    )
  })

  it('should be able to create a market', async () => {
    inMemoryEventsRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
    })

    await sut.execute({
      eventId: '1',
      createdAt: new Date('2022-04-23T10:00:00Z'),
      marketId: '1',
      selections: ['1', '2', 'The Draw'],
      type: 'MATCH_ODDS',
    })

    expect(inMemoryMarketsRepository.markets.get('1')).toEqual(
      expect.objectContaining({
        selections: ['1', '2', 'The Draw'],
        type: 'MATCH_ODDS',
        status: 'OPEN',
        odds: [],
      }),
    )
  })

  it('should not be able to create a market if a market with same type already exists', async () => {
    inMemoryEventsRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
    })

    inMemoryMarketsRepository.markets.set('1', {
      selections: ['1', '2', 'The Draw'],
      type: 'MATCH_ODDS',
      status: 'OPEN',
      createdAt: new Date('2022-04-23T12:00:00Z'),
      eventId: '1',
      odds: [
        {
          value: 1.5,
          timestamp: new Date('2022-04-23T12:00:00Z'),
          selection: '1',
        },
      ],
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
