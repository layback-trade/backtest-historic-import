import { MatchesRepository } from '../repositories/matches-repository'

export class CountMatchesUseCase {
  constructor(private matchesRepository: MatchesRepository) {}

  async execute() {
    return await this.matchesRepository.count()
  }
}
