import { Competition } from '../../enterprise/competition'
import { Country } from '../../enterprise/country'
import { CompetitionsRepository } from '../repositories/competitions-repository'

interface CreateCompetitionUseCaseProps {
  name: string
  cc: string
  id: string
}

export class CreateCompetitionUseCase {
  constructor(
    private readonly competitionsRepository: CompetitionsRepository,
  ) {}

  async execute({
    name,
    id,
    cc,
  }: CreateCompetitionUseCaseProps): Promise<void> {
    const competitionExists = await this.competitionsRepository.findById(id)

    if (competitionExists) {
      throw new Error('Competition already exists')
    }

    // Country registred?

    const competition = new Competition(
      {
        name,
        cc: new Country(cc),
      },
      id,
    )

    await this.competitionsRepository.create(competition)
  }
}
