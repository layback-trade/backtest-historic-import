import { InMemoryMatchesRepository } from '@/infra/repositories/in-memory/in-memory-matches-repository'
import { RegisterNewMatchStatisticUseCase } from './register-new-match-statistic'

let sut: RegisterNewMatchStatisticUseCase
let inMemoryMatchRepository: InMemoryMatchesRepository

describe('Register match new statistic', () => {
  beforeEach(() => {
    inMemoryMatchRepository = new InMemoryMatchesRepository()
    sut = new RegisterNewMatchStatisticUseCase(inMemoryMatchRepository)
  })

  it('should be able to register a new statistic for a match', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    await sut.execute({
      matchId: '1',
      timestamp: new Date('2022-01-01T00:30:00Z'), // During the first half
      teamSide: 'home',
      type: 'GOAL',
      value: 1,
    })

    const match = inMemoryMatchRepository.matches.get('1')
    expect(match?.statistics).toHaveLength(1)
    expect(match?.statistics[0]).toEqual(
      expect.objectContaining({
        teamSide: 'home',
        timestamp: new Date('2022-01-01T00:30:00Z'),
        type: 'GOAL',
        value: 1,
      }),
    )
  })

  it('should not be able to register a statistic if the match does not exist', async () => {
    await expect(
      sut.execute({
        matchId: 'nonexistent',
        timestamp: new Date(),
        teamSide: 'home',
        type: 'GOAL',
        value: 1,
      }),
    ).rejects.toThrow('Match not found')
  })

  it.skip('should not be able to register a statistic if the statistic is registered before the match starts', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:30:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    await expect(
      sut.execute({
        matchId: '1',
        timestamp: new Date('2022-01-01T00:00:00Z'), // Before the match starts
        teamSide: 'home',
        type: 'GOAL',
        value: 1,
      }),
    ).rejects.toThrow('Statistic cannot be registered before the match starts')
  })

  it.skip('should not be able to register a statistic if the statistic is registered during the interval', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    await expect(
      sut.execute({
        matchId: '1',
        timestamp: new Date('2022-01-01T00:50:00Z'), // During the interval
        teamSide: 'home',
        type: 'GOAL',
        value: 1,
      }),
    ).rejects.toThrow('Statistic cannot be registered during the interval')
  })

  it.skip('should not be able to register a statistic if the statistic is registered before the second half starts', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      secondHalfStart: new Date('2022-01-01T01:00:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    await expect(
      sut.execute({
        matchId: '1',
        timestamp: new Date('2022-01-01T00:55:00Z'), // Before the second half starts
        teamSide: 'home',
        type: 'GOAL',
        value: 1,
      }),
    ).rejects.toThrow(
      'Statistic cannot be registered before the second half starts',
    )
  })

  it.skip('should not be able to register a statistic if the statistic is registered after the second half end', async () => {
    inMemoryMatchRepository.matches.set('1', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      secondHalfStart: new Date('2022-01-01T01:00:00Z'),
      secondHalfEnd: new Date('2022-01-01T01:45:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    await expect(
      sut.execute({
        matchId: '1',
        timestamp: new Date('2022-01-01T02:00:00Z'), // After the second half end
        teamSide: 'home',
        type: 'GOAL',
        value: 1,
      }),
    ).rejects.toThrow(
      'Statistic cannot be registered after the second half end',
    )
  })

  it.skip('should not be able to register a statistic if a statistic of the same type and team side is registered with less than 1 minute difference', async () => {
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
          timestamp: new Date('2022-01-01T01:10:00Z'),
          type: 'GOAL',
          value: 1,
        },
      ],
    })

    await expect(
      sut.execute({
        matchId: '1',
        timestamp: new Date('2022-01-01T01:10:30Z'), // Less than 1 minute difference
        teamSide: 'home',
        type: 'GOAL',
        value: 1,
      }),
    ).rejects.toThrow(
      'Statistic cannot be registered with less than 1 minute difference from another statistic of the same type and team side',
    )
  })
})
