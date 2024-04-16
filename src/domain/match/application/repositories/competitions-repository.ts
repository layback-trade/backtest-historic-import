import { Competition } from '../../enterprise/competition'

export interface CompetitionsRepository {
  findById(id: string): Promise<Competition | null>
  create(competition: Competition): Promise<void>
}
