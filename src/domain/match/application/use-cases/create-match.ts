import { Match } from '../../enterprise/match'
import { MatchesRepository } from '../repositories/matches-repository'

interface CreateMatchUseCaseProps {
  id: string
  awayTeamId: string
  homeTeamId: string
  competitionId: string
  firstHalfStart: Date
}

export class CreateMatchUseCase {
  constructor(private readonly matchesRepository: MatchesRepository) {}

  async execute({
    awayTeamId,
    competitionId,
    firstHalfStart,
    homeTeamId,
    id,
  }: CreateMatchUseCaseProps): Promise<void> {
    const matchExists = await this.matchesRepository.findById(id)

    if (matchExists) {
      throw new Error('Match already exists')
    }

    // const homeTeamExists = await this.teamsRepository.findById(homeTeamId)
    // const awayTeamExists = await this.teamsRepository.findById(homeTeamId)

    const match = new Match(
      {
        awayTeamId,
        competitionId,
        homeTeamId,
        firstHalfStart,
      },
      id,
    )

    await this.matchesRepository.create(match)
  }
}
