import { TeamsRepository } from '@/domain/match/application/repositories/teams-repository'
import { Team } from '@/domain/match/enterprise/team'

interface InMemoryPersistenceTeam {
  name: string
}

export class InMemoryTeamsRepository implements TeamsRepository {
  public teams: Map<string, InMemoryPersistenceTeam> = new Map()

  async create(team: Team): Promise<void> {
    this.teams.set(team.id, {
      name: team.name,
    })
  }

  async save(team: Team): Promise<void> {
    this.teams.set(team.id, {
      name: team.name,
    })
  }

  async findById(id: string) {
    const team = this.teams.get(id)

    return team
      ? new Team(
          {
            name: team.name,
          },
          id,
        )
      : null
  }
}
