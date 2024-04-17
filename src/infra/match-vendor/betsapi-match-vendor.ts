import axios from 'axios'
import {
  differenceInSeconds,
  isBefore,
  subMilliseconds,
  subMinutes,
} from 'date-fns'
import { env } from '../env'
import { MatchVendor, MatchVendorResponse } from './match-vendor'

const statisticsMap = new Map([
  ['possession', 'POSSESSION'],
  ['substitutions', 'SUBSTITUTION'],
  ['redcards', 'RED_CARD'],
  ['penalties', 'PENALTY'],
  ['goals', 'GOAL'],
  ['corners', 'CORNER'],
  ['attacks', 'ATTACK'],
  ['dangerous_attacks', 'DANGEROUS_ATTACK'],
  ['on_target', 'SHOT_ON_TARGET'],
  ['off_target', 'SHOT_OFF_TARGET'],
  ['yellowcards', 'YELLOW_CARD'],
])

interface BetsAPIMatchResponse {
  id: string
  time: string
  league: {
    id: string
    name: string
    cc: string
  }
  home: {
    id: string
    name: string
    image_id: string
    cc: string
  }
  // scores: {
  //   '1': {
  //     home: string
  //     away: string
  //   }
  //   '2': {
  //     home: string
  //     away: string
  //   }
  // }
  away: {
    id: string
    name: string
    image_id: string
    cc: string
  }
  ss: string
}

interface BetsAPIStatistic {
  home: {
    time_str: string
    val: string
    created_at: string
  }[]
  away: {
    time_str: string
    val: string
    created_at: string
  }[]
}

interface BetsAPIStatisticsResponse {
  possession: BetsAPIStatistic
  substitutions: BetsAPIStatistic
  redcards: BetsAPIStatistic
  penalties: BetsAPIStatistic
  goals: BetsAPIStatistic
  corners: BetsAPIStatistic
  attacks: BetsAPIStatistic
  dangerous_attacks: BetsAPIStatistic
  on_target: BetsAPIStatistic
  off_target: BetsAPIStatistic
  yellowcards: BetsAPIStatistic
  score_h: BetsAPIStatistic
}

export class BetsAPIMatchVendor implements MatchVendor {
  private readonly MAX_PARALLEL_REQUESTS = 5

  async fetchMatches(eventsId: string[]): Promise<MatchVendorResponse[]> {
    const batchedEventsId: string[][] = []
    for (let i = 0; i < eventsId.length; i += this.MAX_PARALLEL_REQUESTS) {
      batchedEventsId.push(eventsId.slice(i, i + this.MAX_PARALLEL_REQUESTS))
    }

    const responses = await Promise.all(
      batchedEventsId.map((batch) =>
        axios.get(
          `https://api.b365api.com/v1/betfair/result?token=${
            env.BETSAPI_TOKEN
          }&event_id=${batch.join(',')}`,
        ),
      ),
    )

    const betsAPIMatches: MatchVendorResponse[] = responses.map(
      (response, batchIndex) => {
        return response.data.results
          .map((ev: BetsAPIMatchResponse, i: number) => {
            if (response.data.success > 0 && ev.ss) {
              const match: Partial<MatchVendorResponse> = {
                id: batchedEventsId[batchIndex][i],
                vendorMatchId: ev.id,
                competition: ev.league,
                homeTeam: ev.home,
                awayTeam: ev.away,
                firstHalfStart: new Date('2030-01-01'),
                firstHalfEnd: new Date('2030-01-01'),
                secondHalfStart: new Date('2030-01-01'),
                secondHalfEnd: new Date('2030-01-01'),
                statistics: [],
              }
              return match
            }
            return null
          })
          .filter(Boolean)
          .flat()
      },
    )

    const matchesBatched = []
    for (
      let i = 0;
      i < betsAPIMatches.length;
      i += this.MAX_PARALLEL_REQUESTS
    ) {
      matchesBatched.push(
        betsAPIMatches.slice(i, i + this.MAX_PARALLEL_REQUESTS),
      )
    }

    for (const matchBatch of matchesBatched) {
      const statisticsResponse = await Promise.all(
        matchBatch.map((match) =>
          axios.get(
            `https://api.b365api.com/v1/event/stats_trend?token=${process.env.BETS_API_TOKEN}&event_id=${match.vendorMatchId}`,
          ),
        ),
      )

      for (const statisticResponse of statisticsResponse) {
        console.log({
          teste: statisticResponse.request,
          url: statisticResponse.headers,
        })
        const match = betsAPIMatches.find(
          (match) =>
            match.vendorMatchId ===
            statisticResponse.request.responseURL.split('=')[1],
        )
        if (!match) {
          throw new Error('Error fetching match statistics')
        }

        match.statistics = statisticResponse.data.results.map(
          (stat: BetsAPIStatisticsResponse) => {
            const statisticsFormatted = Object.entries(stat).map((data) => {
              const [key, value] = data as [string, BetsAPIStatistic]

              const hasStatisticBeforeFirstHalf =
                value.home.find((stat) =>
                  isBefore(
                    new Date(parseInt(stat.created_at)),
                    match.firstHalfStart,
                  ),
                ) ||
                value.away.find((stat) =>
                  isBefore(
                    new Date(parseInt(stat.created_at)),
                    match.firstHalfStart,
                  ),
                )
              if (hasStatisticBeforeFirstHalf) {
                match.firstHalfStart = new Date(
                  parseInt(hasStatisticBeforeFirstHalf.created_at),
                )
              }

              if (
                key === 'score_h' &&
                isBefore(
                  new Date(parseInt(value.home[0].created_at)),
                  match.firstHalfEnd,
                )
              ) {
                match.firstHalfEnd = new Date(
                  parseInt(value.home[0].created_at),
                )
              }

              const statAtSecondHalf = value.home.find(
                (stat) =>
                  parseInt(stat.time_str) >= 60 && parseInt(stat.time_str) < 90,
              )
              if (statAtSecondHalf) {
                const supposedSecondHalfStart = subMinutes(
                  new Date(parseInt(statAtSecondHalf.created_at)),
                  parseInt(statAtSecondHalf.time_str) - 46,
                )
                const statisticsAtSecondHalfStart = value.home
                  .filter(
                    (st) =>
                      (parseInt(st.time_str) === 46 ||
                        parseInt(st.time_str) === 45) &&
                      differenceInSeconds(
                        supposedSecondHalfStart,
                        new Date(parseInt(st.created_at)),
                      ) <= 120,
                  )
                  .map((st) => new Date(parseInt(st.created_at)))
                statisticsAtSecondHalfStart.push(supposedSecondHalfStart)
                if (
                  isBefore(
                    statisticsAtSecondHalfStart[0],
                    match.secondHalfStart,
                  )
                ) {
                  match.secondHalfStart = statisticsAtSecondHalfStart[0]
                }
              }

              const type = statisticsMap.get(key)
              if (!type) {
                return []
              }
              const home = value.home.map((statistic, index) => {
                return {
                  teamSide: 'home',
                  type,
                  timestamp: new Date(parseInt(statistic.created_at)),
                  value: parseInt(statistic.val),
                  staledAt: subMilliseconds(
                    new Date(value.home[index + 1].created_at),
                    1,
                  ),
                }
              })
              const away = value.away.map((statistic, index) => {
                return {
                  teamSide: 'away',
                  type,
                  timestamp: new Date(parseInt(statistic.created_at)),
                  value: parseInt(statistic.val),
                  staledAt: subMilliseconds(
                    new Date(value.away[index + 1].created_at),
                    1,
                  ),
                }
              })
              return [...home, ...away]
            })

            return statisticsFormatted.flat()
          },
        )
      }
    }
    return betsAPIMatches
  }
}
