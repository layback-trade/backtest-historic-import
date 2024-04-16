import axios from 'axios'
import { env } from '../env'
import { MatchVendor, MatchVendorResponse } from './match-vendor'

export class BetsAPIMatchVendor implements MatchVendor {
  private readonly MAX_PARALLEL_REQUESTS = 5

  async fetchMatches(eventsId: string[]): Promise<MatchVendorResponse[]> {
    const batchedEventsId = []
    for (let i = 0; i < eventsId.length; i += this.MAX_PARALLEL_REQUESTS) {
      batchedEventsId.push(eventsId.slice(i, i + this.MAX_PARALLEL_REQUESTS))
    }

    const responses = await Promise.all(
      batchedEventsId.map((batch) => {
        return axios.get(
          `https://api.b365api.com/v1/betfair/result?token=${
            env.BETSAPI_TOKEN
          }&event_id=${batch.join(',')}`,
        )
      }),
    )

    console.log({ responses })
    for (const response of responses) {
      if (response.status === 200) {
        return response.data
      }
    }

    return []
  }
}
