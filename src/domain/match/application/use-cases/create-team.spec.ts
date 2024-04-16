import { InMemoryTeamsRepository } from '@/infra/cache/repositories/in-memory-teams-repository'
import { CreateTeamUseCase } from './create-team'

let sut: CreateTeamUseCase
let inMemoryTeamRepository: InMemoryTeamsRepository

describe('Create team', async () => {
  beforeEach(() => {
    inMemoryTeamRepository = new InMemoryTeamsRepository()
    sut = new CreateTeamUseCase(inMemoryTeamRepository)
  })

  it('should be able to create a team', async () => {
    await sut.execute({
      id: '1',
      name: 'Manchester United',
    })

    expect(inMemoryTeamRepository.teams.get('1')).toEqual(
      expect.objectContaining({
        name: 'Manchester United',
      }),
    )
  })

  it('should not be able to add a team that already exists', async () => {
    inMemoryTeamRepository.teams.set('1', {
      name: 'Manchester United',
    })

    expect(() =>
      sut.execute({
        id: '1',
        name: 'Manchester United',
      }),
    ).rejects.toThrowError('Team already exists')
  })
})
