import { MatchesRepository } from '../repositories/matches-repository'

interface EndMatchSecondHalfUseCaseProps {
  id: string
  timestamp: Date
}

export class EndMatchSecondHalfUseCase {
  constructor(private matchesRepository: MatchesRepository) {}

  async execute({
    id,
    timestamp,
  }: EndMatchSecondHalfUseCaseProps): Promise<void> {
    const match = await this.matchesRepository.findById(id)

    if (!match) {
      throw new Error('Match not found')
    }

    match.endSecondHalf(timestamp)

    await this.matchesRepository.save(match)
  }
}
