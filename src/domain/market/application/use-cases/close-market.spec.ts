import { InMemoryEventsRepository } from '@/infra/cache/repositories/in-memory-events-repository'
import { AddEventMarketUseCase } from './add-event-market'

let sut: AddEventMarketUseCase
let inMemoryEventRepository: InMemoryEventsRepository

describe('Close market', async () => {
  beforeAll(() => {
    inMemoryEventRepository = new InMemoryEventsRepository()
    sut = new AddEventMarketUseCase(inMemoryEventRepository)
  })

  it('should be able to close a market', async () => {
    const markets = new Map()
    markets.set('1', {
      selections: ['1', '2'],
      type: 'MATCH_ODDS',
      status: 'OPEN',
      odds: [],
    })

    inMemoryEventRepository.events.set('1', {
      name: 'team 1 v team 2',
      scheduledStartDate: new Date('2022-04-23T18:00:00Z'),
      markets,
    })

    await sut.execute({
      eventId: '1',
      createdAt: new Date('2022-04-23T10:00:00Z'),
      marketId: '1',
      selections: ['1', '2'],
      type: 'MATCH_ODDS',
    })

    expect(inMemoryEventRepository.events.get('1')).not.toBeNull()
    expect(inMemoryEventRepository.events.get('1')?.markets.get('1')).toEqual(
      expect.objectContaining({
        selections: ['1', '2'],
        type: 'MATCH_ODDS',
        status: 'OPEN',
        odds: [],
      }),
    )
  })
  // TO-DO MORE
})
