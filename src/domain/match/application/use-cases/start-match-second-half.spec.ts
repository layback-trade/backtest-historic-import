import { InMemoryMatchesRepository } from '@/infra/cache/repositories/in-memory-matches-repository'
import { StartMatchSecondHalfUseCase } from './start-match-second-half'

let sut: StartMatchSecondHalfUseCase
let inMemoryMatchRepository: InMemoryMatchesRepository

describe('Start second half', async () => {
  beforeEach(() => {
    inMemoryMatchRepository = new InMemoryMatchesRepository()
    sut = new StartMatchSecondHalfUseCase(inMemoryMatchRepository)
  })

  it(`should be able to start a match's second half`, async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      homeTeamId: '2',
      statistics: [
        {
          teamSide: 'home',
          timestamp: new Date('2022-01-01T00:03:00Z'),
          type: 'ATTACK',
          value: 1,
        },
      ],
    })

    await sut.execute({
      id: '1',
      timestamp: new Date('2022-01-01T01:00:00Z'),
    })

    expect(inMemoryMatchRepository.matches.get('1')).toEqual(
      expect.objectContaining({
        awayTeamId: '1',
        competitionId: '1',
        homeTeamId: '2',
        statistics: expect.any(Array),
        secondHalfStart: new Date('2022-01-01T01:00:00Z'),
      }),
    )
  })

  it('should not be able to start a second half of a match that does not exist', async () => {
    expect(() =>
      sut.execute({
        id: 'exists',
        timestamp: new Date('2022-01-01T00:45:00Z'),
      }),
    ).rejects.toThrowError('Match not found')
  })

  it('should not be able to start a second half if it has already started', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      secondHalfStart: new Date('2022-01-01T01:00:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T01:00:00Z'),
      }),
    ).rejects.toThrowError('Second half already started')
  })

  it('should not be able to start a second half if the first half has not been finished', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T01:00:00Z'),
      }),
    ).rejects.toThrowError('First half not ended yet')
  })

  it('should not be able to start a second half if the second half is earlier than the first', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T00:40:00Z'),
      }),
    ).rejects.toThrowError(
      'Second half start must be later than the first half ending',
    )
  })

  it('should not be able to start a second half if the interval duration is less than five minutes', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T00:49:00Z'),
      }),
    ).rejects.toThrowError('Interval must last at least 5 minutes')
  })

  it('should not be able to start a second half if the interval is longer than 25 minutes', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T01:11:00Z'),
      }),
    ).rejects.toThrowError('Interval must not last more than 25 minutes')
  })
})
