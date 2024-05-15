import { Match } from '../../enterprise/match'

export interface MatchesRepository {
  findById(id: string): Promise<Match | null>
  create(match: Match): Promise<void>
  save(match: Match): Promise<void>
  count(): Promise<number>
}
