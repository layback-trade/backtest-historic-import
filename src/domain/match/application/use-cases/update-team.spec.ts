import { InMemoryTeamsRepository } from '@/infra/cache/repositories/in-memory-teams-repository'
import { UpdateTeamNameUseCase } from './update-team-name'

let sut: UpdateTeamNameUseCase
let inMemoryTeamRepository: InMemoryTeamsRepository

describe('Update team name', async () => {
  beforeEach(() => {
    inMemoryTeamRepository = new InMemoryTeamsRepository()
    sut = new UpdateTeamNameUseCase(inMemoryTeamRepository)
  })

  it('should be able to change a team name', async () => {
    inMemoryTeamRepository.teams.set('1', {
      name: 'Manchester City',
    })

    await sut.execute({
      id: '1',
      newName: 'Man City',
    })

    expect(inMemoryTeamRepository.teams.get('1')).toEqual(
      expect.objectContaining({
        name: 'Man City',
      }),
    )
  })

  it('should not be able to change a team name to the same name', async () => {
    inMemoryTeamRepository.teams.set('1', {
      name: 'Manchester United',
    })

    await sut.execute({
      id: '1',
      newName: 'Manchester United',
    })

    expect(inMemoryTeamRepository.teams.get('1')).toEqual(
      expect.objectContaining({
        name: 'Manchester United',
      }),
    )
  })
})
