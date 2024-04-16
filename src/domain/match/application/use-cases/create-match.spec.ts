import { InMemoryMatchesRepository } from '@/infra/cache/repositories/in-memory-matches-repository'
import { CreateMatchUseCase } from './create-match'

let sut: CreateMatchUseCase
let inMemoryMatchRepository: InMemoryMatchesRepository

describe('Create match', async () => {
  beforeEach(() => {
    inMemoryMatchRepository = new InMemoryMatchesRepository()
    sut = new CreateMatchUseCase(inMemoryMatchRepository)
  })

  it('should be able to create a match', async () => {
    await sut.execute({
      id: '1',
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01'),
      homeTeamId: '2',
    })

    expect(inMemoryMatchRepository.matches.get('1')).toEqual(
      expect.objectContaining({
        awayTeamId: '1',
        competitionId: '1',
        firstHalfStart: new Date('2022-01-01'),
        homeTeamId: '2',
        statistics: [],
      }),
    )
  })

  it('should not be able to add a match that already exists', async () => {
    inMemoryMatchRepository.matches.set('exists', {
      awayTeamId: '1',
      competitionId: '1',
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      homeTeamId: '2',
      statistics: [],
    })

    expect(() =>
      sut.execute({
        id: 'exists',
        awayTeamId: '1',
        competitionId: '1',
        firstHalfStart: new Date('2022-01-01'),
        homeTeamId: '2',
      }),
    ).rejects.toThrowError('Match already exists')
  })

  it('should not be able to create a match that starts in the future', async () => {
    expect(() =>
      sut.execute({
        id: '1',
        awayTeamId: '1',
        competitionId: '1',
        firstHalfStart: new Date('2050-01-01'),
        homeTeamId: '2',
      }),
    ).rejects.toThrowError('Match cannot start in the future')
  })
})
