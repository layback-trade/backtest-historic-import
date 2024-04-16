import { Team } from '../../enterprise/team'
import { TeamsRepository } from '../repositories/teams-repository'

interface CreateTeamUseCaseProps {
  name: string
  // cc: string
  id: string
}

export class CreateTeamUseCase {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  async execute({ name, id }: CreateTeamUseCaseProps): Promise<void> {
    const teamExists = await this.teamsRepository.findById(id)

    if (teamExists) {
      throw new Error('Team already exists')
    }

    // Country registred?

    const team = new Team(
      {
        name,
        // cc,
      },
      id,
    )

    await this.teamsRepository.create(team)
  }
}
