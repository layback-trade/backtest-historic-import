import { InMemoryMatchesRepository } from '@/infra/repositories/in-memory/in-memory-matches-repository'
import { EndMatchSecondHalfUseCase } from './end-match-second-half'

let sut: EndMatchSecondHalfUseCase
let inMemoryMatchRepository: InMemoryMatchesRepository

describe('End second half', async () => {
  beforeEach(() => {
    inMemoryMatchRepository = new InMemoryMatchesRepository()
    sut = new EndMatchSecondHalfUseCase(inMemoryMatchRepository)
  })

  it(`should be able to end a match's second half`, async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      secondHalfStart: new Date('2022-01-01T01:00:00Z'),
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
      timestamp: new Date('2022-01-01T01:45:00Z'),
    })

    expect(inMemoryMatchRepository.matches.get('1')).toEqual(
      expect.objectContaining({
        awayTeamId: '1',
        competitionId: '1',
        homeTeamId: '2',
        statistics: expect.any(Array),
        secondHalfEnd: new Date('2022-01-01T01:45:00Z'),
      }),
    )
  })

  it('should not be able to end a second half of a match that does not exist', async () => {
    expect(() =>
      sut.execute({
        id: 'exists',
        timestamp: new Date('2022-01-01T00:45:00Z'),
      }),
    ).rejects.toThrowError('Match not found')
  })

  it('should not be able to end a second half if it has already ended', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      secondHalfStart: new Date('2022-01-01T00:45:00Z'),
      secondHalfEnd: new Date('2022-01-01T01:45:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T01:45:00Z'),
      }),
    ).rejects.toThrowError('Second half already ended')
  })

  it('should not be able to end a second half if the second half has not started', async () => {
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
        timestamp: new Date('2022-01-01T01:00:00Z'),
      }),
    ).rejects.toThrowError('Second half not started yet')
  })

  it('should not be able to end a second half if the end is earlier than the start', async () => {
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
        timestamp: new Date('2022-01-01T00:55:00Z'),
      }),
    ).rejects.toThrowError('Second half end must not be earlier than the start')
  })

  it('should not be able to end a second half if its duration is less than 45 minutes', async () => {
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
        timestamp: new Date('2022-01-01T01:25:00Z'),
      }),
    ).rejects.toThrowError('Second half must last at least 45 minutes')
  })

  it('should not be able to end a second half if its duration is more than 60 minutes', async () => {
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
        timestamp: new Date('2022-01-01T02:01:00Z'),
      }),
    ).rejects.toThrowError('Second half must not last more than 60 minutes')
  })
})
