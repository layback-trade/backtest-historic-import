import { Team } from '../../enterprise/team'

export interface TeamsRepository {
  findById(id: string): Promise<Team | null>
  create(team: Team): Promise<void>
}
