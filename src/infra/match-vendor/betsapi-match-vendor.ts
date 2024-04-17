import axios from 'axios'
import { env } from '../env'
import { MatchVendor, MatchVendorResponse } from './match-vendor'

interface BetsAPIMatchResponse {}

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

    const baseBetsAPIEvents: MatchVendorResponse[] = responses.map(
      (response) => {
        return response.data.results
          .map((ev: any, i: number) => {
            betfairBetsApiId.set(ev.id, Number(eventsIdsToFind[i]))
            if (responseEvents.data.success > 0 && ev.ss) {
              if (ev.league) {
                competitions.push({
                  countryId: ev.league.cc,
                  id: ev.league.id,
                  name: ev.league.name,
                  betfairId: null,
                  laybackId: null,
                  newName: null,
                  oldName: null,
                })
                ev.league.cc && countries.push({ id: ev.league.cc })
              }

              metadataByEventMap.set(Number(eventsIdsToFind[i]), {
                firstHalfEnd: null,
                firstHalfStart: null,
                secondHalfStart: null,
                awayTeamHTScore: Number(ev.scores?.['1']?.away) || 0,
                awayTeamScore: Number(ev.scores?.['2']?.away) || 0,
                homeTeamHTScore: Number(ev.scores?.['1']?.home) || 0,
                homeTeamScore: Number(ev.scores?.['2']?.home) || 0,
                competitionId: Number(ev.league.id),
              })
              return {}
            }
            return responseEvents.data.success && ev.ss
          })
          .flat()
      },
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
