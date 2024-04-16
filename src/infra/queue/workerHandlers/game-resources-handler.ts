import { InMemoryMatchesRepository } from '@/infra/cache/repositories/in-memory-matches-repository'
import { BetsAPIMatchVendor } from '@/infra/match-vendor/betsapi-match-vendor'

interface MarketResourceHandlerProps {
  data: {
    eventsIdBatch: string[]
  }
}

const inMemoryMatchesRepository = new InMemoryMatchesRepository()
const matchVendor = new BetsAPIMatchVendor()
export async function matchResourcesHandler({
  data,
}: MarketResourceHandlerProps) {
  // if(data.eventsIdBatch.length === 0) {
  //   throw new Error('No events to fetch')
  // }
  // if(data.eventsIdBatch.length > 10) {
  //   throw new Error('Too many events to fetch')
  // }

  // Verify if the events exist in the repository

  // call the external service to fetch the events
  const matches = await matchVendor.fetchMatches(data.eventsIdBatch)

  for (const match of matches) {
    // await inMemoryMatchesRepository.create(match)
    // create competition
    // create team
    // create country
    //
  }

  return inMemoryMatchesRepository.matches.size
}
