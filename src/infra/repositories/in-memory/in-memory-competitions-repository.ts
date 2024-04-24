import { CompetitionsRepository } from '@/domain/match/application/repositories/competitions-repository'
import { Competition } from '@/domain/match/enterprise/competition'
import { Country } from '@/domain/match/enterprise/country'

interface InMemoryPersistenceCompetition {
  name: string
  cc: string
}

export class InMemoryCompetitionsRepository implements CompetitionsRepository {
  public competitions: Map<string, InMemoryPersistenceCompetition> = new Map()

  async create(competition: Competition): Promise<void> {
    this.competitions.set(competition.id, {
      cc: competition.cc,
      name: competition.name,
    })
  }

  async findById(id: string) {
    const competition = this.competitions.get(id)

    return competition
      ? new Competition(
          {
            cc: new Country(competition.cc),
            name: competition.name,
          },
          id,
        )
      : null
  }
}
