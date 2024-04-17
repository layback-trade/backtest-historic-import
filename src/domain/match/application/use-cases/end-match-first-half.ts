import { MatchesRepository } from '../repositories/matches-repository'

interface EndMatchFirstHalfUseCaseProps {
  id: string
  timestamp: Date
}

export class EndMatchFirstHalfUseCase {
  constructor(private matchesRepository: MatchesRepository) {}

  async execute({
    id,
    timestamp,
  }: EndMatchFirstHalfUseCaseProps): Promise<void> {
    const match = await this.matchesRepository.findById(id)

    if (!match) {
      throw new Error('Match not found')
    }

    match.endFirstHalf(timestamp)

    await this.matchesRepository.save(match)
  }
}
