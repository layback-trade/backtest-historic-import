import { Team } from '../../enterprise/team'
import { TeamsRepository } from '../repositories/teams-repository'

interface UpdateTeamNameUseCaseProps {
  newName: string
  id: string
}

export class UpdateTeamNameUseCase {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  async execute({ newName, id }: UpdateTeamNameUseCaseProps): Promise<void> {
    const teamExists = await this.teamsRepository.findById(id)

    if (!teamExists) {
      throw new Error('Team does not exist')
    }

    // Country registred?
    if (newName === teamExists.name) {
      // throw new Error('Name did not change')
      return
    }

    const team = new Team(
      {
        name: newName,
        // cc,
      },
      id,
    )

    await this.teamsRepository.save(team)
  }
}
