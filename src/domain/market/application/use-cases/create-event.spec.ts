import { InMemoryEventsRepository } from '@/infra/repositories/in-memory/in-memory-events-repository'
import { CreateEventUseCase } from './create-event'

let sut: CreateEventUseCase
let inMemoryEventsRepository: InMemoryEventsRepository

describe('Create event', async () => {
  beforeEach(() => {
    inMemoryEventsRepository = new InMemoryEventsRepository()
    sut = new CreateEventUseCase(inMemoryEventsRepository)
  })

  it('should be able to create an event', async () => {
    await sut.execute({
      id: '1',
      name: 'Team 1 v Team 2',
      scheduledStartDate: new Date('2022-04-23'),
    })

    expect(inMemoryEventsRepository.events.get('1')).toEqual(
      expect.objectContaining({
        name: 'Team 1 v Team 2',
        scheduledStartDate: new Date('2022-04-23'),
      }),
    )
  })

  it('should not be able to add a event that already exists', async () => {
    inMemoryEventsRepository.events.set('1', {
      name: 'Team 1 v Team 2',
      scheduledStartDate: new Date('2022-04-23'),
    })

    expect(() =>
      sut.execute({
        id: '1',
        name: 'Team 1 v Team 2',
        scheduledStartDate: new Date('2022-04-23'),
      }),
    ).rejects.toThrowError('Event already exists')
  })

  it('should not be able to add an event too old', async () => {
    expect(async () => {
      await sut.execute({
        id: '1',
        name: 'Team 1 v Team 2',
        scheduledStartDate: new Date('2019-12-30'),
      })
    }).rejects.toThrowError('Start date too old')
  })

  it('should not be able to add an event with an invalid name', async () => {
    expect(async () => {
      await sut.execute({
        id: '1',
        name: 'My team x your team',
        scheduledStartDate: new Date('2022-04-23'),
      })
    }).rejects.toThrowError('Invalid event name')
  })
})
