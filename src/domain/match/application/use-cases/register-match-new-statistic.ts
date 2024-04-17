import {
  Statistic,
  StatisticType,
  TeamSide,
} from '../../enterprise/value-objects/statistic'
import { MatchesRepository } from '../repositories/matches-repository'

interface RegisterMatchNewStatisticUseCaseProps {
  matchId: string
  timestamp: Date
  teamSide: TeamSide
  type: StatisticType
  value: number
}

export class RegisterMatchNewStatisticUseCase {
  constructor(private matchesRepository: MatchesRepository) {}

  async execute({
    matchId,
    timestamp,
    teamSide,
    type,
    value,
  }: RegisterMatchNewStatisticUseCaseProps): Promise<void> {
    const match = await this.matchesRepository.findById(matchId)

    if (!match) {
      throw new Error('Match not found')
    }

    const statistic = new Statistic({
      teamSide,
      timestamp,
      type,
      value,
    })

    match.registerNewStatistic(statistic)

    await this.matchesRepository.save(match)
  }
}
