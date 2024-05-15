import { MatchesRepository } from '@/domain/match/application/repositories/matches-repository'
import { Match } from '@/domain/match/enterprise/match'
import { Statistic } from '@/domain/match/enterprise/value-objects/statistic'

interface InMemoryPersistenceMatch {
  homeTeamId: string
  awayTeamId: string
  competitionId: string
  firstHalfStart: Date
  firstHalfEnd?: Date
  secondHalfStart?: Date
  secondHalfEnd?: Date
  statistics: Statistic[]
}

export class InMemoryMatchesRepository implements MatchesRepository {
  public matches: Map<string, InMemoryPersistenceMatch> = new Map()

  async create(match: Match): Promise<void> {
    this.matches.set(match.id, {
      awayTeamId: match.awayTeamId,
      competitionId: match.competitionId,
      firstHalfStart: match.firstHalfStart,
      homeTeamId: match.homeTeamId,
      statistics: match.statistics,
      firstHalfEnd: match.firstHalfEnd,
      secondHalfStart: match.secondHalfStart,
      secondHalfEnd: match.secondHalfEnd,
    })
  }

  async save(match: Match): Promise<void> {
    this.matches.set(match.id, {
      awayTeamId: match.awayTeamId,
      competitionId: match.competitionId,
      firstHalfStart: match.firstHalfStart,
      homeTeamId: match.homeTeamId,
      statistics: match.statistics,
      firstHalfEnd: match.firstHalfEnd,
      secondHalfStart: match.secondHalfStart,
      secondHalfEnd: match.secondHalfEnd,
    })
  }

  async findById(id: string) {
    const match = this.matches.get(id)

    return match
      ? new Match(
          {
            ...match,
            statistics: match.statistics.map((stat) => new Statistic(stat)),
          },
          id,
        )
      : null
  }

  async count(): Promise<number> {
    return this.matches.size
  }
}
