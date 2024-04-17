import { MatchesRepository } from '../repositories/matches-repository'

interface StartMatchSecondHalfUseCaseProps {
  id: string
  timestamp: Date
}

export class StartMatchSecondHalfUseCase {
  constructor(private matchesRepository: MatchesRepository) {}

  async execute({
    id,
    timestamp,
  }: StartMatchSecondHalfUseCaseProps): Promise<void> {
    const match = await this.matchesRepository.findById(id)

    if (!match) {
      throw new Error('Match not found')
    }

    match.startSecondHalf(timestamp)

    await this.matchesRepository.save(match)
  }
}
