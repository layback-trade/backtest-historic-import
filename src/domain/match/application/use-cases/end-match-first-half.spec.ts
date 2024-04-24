import { InMemoryMatchesRepository } from '@/infra/repositories/in-memory/in-memory-matches-repository'

import { FirstHalfTooLongError } from '../../enterprise/errors/first-half-too-long-error'
import { EndMatchFirstHalfUseCase } from './end-match-first-half'

let sut: EndMatchFirstHalfUseCase
let inMemoryMatchRepository: InMemoryMatchesRepository

describe('End first half', async () => {
  beforeEach(() => {
    inMemoryMatchRepository = new InMemoryMatchesRepository()
    sut = new EndMatchFirstHalfUseCase(inMemoryMatchRepository)
  })

  it(`should be able to end a match's first half`, async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
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
      timestamp: new Date('2022-01-01T00:45:00Z'),
    })

    expect(inMemoryMatchRepository.matches.get('1')).toEqual(
      expect.objectContaining({
        awayTeamId: '1',
        competitionId: '1',
        firstHalfStart: new Date('2022-01-01'),
        homeTeamId: '2',
        statistics: expect.any(Array),
        firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      }),
    )
  })

  it('should not be able to end a first half of a match that does not exist', async () => {
    expect(() =>
      sut.execute({
        id: 'exists',
        timestamp: new Date('2022-01-01T00:45:00Z'),
      }),
    ).rejects.toThrowError('Match not found')
  })

  it('should not be able to end a first half if there is no statistics', async () => {
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
        timestamp: new Date('2022-01-01T00:45:00Z'),
      }),
    ).rejects.toThrowError('Match must have at least one statistic')
  })

  it('should not be able to end a first half if it ended before the match start', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T10:00:00Z'),
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

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T09:45:00Z'),
      }),
    ).rejects.toThrowError('First half end must not be earlier than the start')
  })

  it('should not be able to end a first half if the first half already ended', async () => {
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

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T00:50:00Z'),
      }),
    ).rejects.toThrowError('First half already ended')
  })

  it('should not be able to end a first half if the first half lasted less than 45 minutes', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
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

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T00:44:00Z'),
      }),
    ).rejects.toThrowError('First half must last at least 45 minutes')
  })

  it('should not be able to end a first half if the first half lasted more than 60 minutes', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
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

    expect(() =>
      sut.execute({
        id: '1',
        timestamp: new Date('2022-01-01T01:01:00Z'),
      }),
    ).rejects.toThrowError(FirstHalfTooLongError)
  })
})
