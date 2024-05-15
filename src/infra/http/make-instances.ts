import { InMemoryCompetitionsRepository } from '../repositories/in-memory/in-memory-competitions-repository'
import { InMemoryEventsRepository } from '../repositories/in-memory/in-memory-events-repository'
import { InMemoryMarketsRepository } from '../repositories/in-memory/in-memory-markets-repository'
import { InMemoryMatchesRepository } from '../repositories/in-memory/in-memory-matches-repository'
import { InMemoryTeamsRepository } from '../repositories/in-memory/in-memory-teams-repository'

export const inMemoryEventsRepository = new InMemoryEventsRepository()
export const inMemoryMatchesRepository = new InMemoryMatchesRepository()
export const inMemoryTeamsRepository = new InMemoryTeamsRepository()
export const inMemoryCompetitionsRepository =
  new InMemoryCompetitionsRepository()
export const inMemoryMarketsRepository = new InMemoryMarketsRepository()
