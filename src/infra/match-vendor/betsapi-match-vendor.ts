import { StatisticType } from '@/domain/match/enterprise/value-objects/statistic'
import axios from 'axios'
import { differenceInMinutes, isBefore, isFuture, subMinutes } from 'date-fns'
import { env } from '../env'
import {
  MatchVendor,
  MatchVendorResponse,
  MatchVendorStatistic,
} from './match-vendor'

const statisticsMap = new Map([
  ['possession', 'POSSESSION'],
  ['substitutions', 'SUBSTITUTION'],
  ['redcards', 'RED_CARD'],
  ['penalties', 'PENALTY'],
  ['goals', 'GOALS'],
  ['corners', 'CORNER'],
  ['attacks', 'ATTACK'],
  ['dangerous_attacks', 'DANGEROUS_ATTACK'],
  ['on_target', 'SHOT_ON_TARGET'],
  ['off_target', 'SHOT_OFF_TARGET'],
  ['yellowcards', 'YELLOW_CARD'],
  ['score_h', 'HALF_TIME_SCORE' as StatisticType],
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

interface ExtendedStatistic extends MatchVendorStatistic {
  matchTime: number
}

export class BetsAPIMatchVendor implements MatchVendor {
  private readonly MAX_PARALLEL_REQUESTS = 3

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

    const betsAPIMatches: MatchVendorResponse[] = responses
      .map((response, batchIndex) => {
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
                statistics: [],
              }
              return match
            }
            return null
          })
          .filter(Boolean)
          .flat()
      })
      .flat()

    const matchesVendorIdBatch: string[][] = []
    for (
      let i = 0;
      i < betsAPIMatches.length;
      i += this.MAX_PARALLEL_REQUESTS
    ) {
      matchesVendorIdBatch.push(
        betsAPIMatches
          .map((match) => match.vendorMatchId)
          .slice(i, i + this.MAX_PARALLEL_REQUESTS),
      )
    }

    for (const vendorsId of matchesVendorIdBatch) {
      const statistics = await this.fetchStatistics(vendorsId)

      for (const vendorId of vendorsId) {
        const match = betsAPIMatches.find(
          (match) => match.vendorMatchId === vendorId,
        )

        if (!match) {
          throw new Error('Match not found')
        }

        const matchStatistics = statistics.filter(
          (stat) => stat.matchId === match.vendorMatchId,
        )

        if (matchStatistics.length > 0) {
          const { firstHalfEnd, firstHalfStart, secondHalfStart } =
            this.defineMatchPeriods(matchStatistics)

          match.firstHalfEnd = firstHalfEnd
          match.firstHalfStart = firstHalfStart
          match.secondHalfStart = secondHalfStart
          match.statistics = matchStatistics.filter((st) => st.value !== 0)
        } else {
          // remove match from the list
          betsAPIMatches.splice(betsAPIMatches.indexOf(match), 1)
        }
      }
    }
    return betsAPIMatches
  }

  private async fetchStatistics(matchIdsBatch: string[]) {
    const statisticsResponse = await Promise.all(
      matchIdsBatch.map((matchId) =>
        axios.get(
          `https://api.b365api.com/v1/event/stats_trend?token=${env.BETSAPI_TOKEN}&event_id=${matchId}`,
        ),
      ),
    )

    const statistics = statisticsResponse
      .map((response) => {
        return this.formatStatistics(
          response.data.results,
          response.config.url!.split('=')[2],
        )
      })
      .flat()

    return statistics
  }

  private formatStatistics(
    statistics: BetsAPIStatisticsResponse,
    matchId: string,
  ) {
    return Object.entries(statistics)
      .map((data) => {
        const [statisticType, value] = data as [string, BetsAPIStatistic]
        const type = statisticsMap.get(statisticType)
        if (!type) {
          return []
        }

        return Object.entries(value)
          .map((valueByTeamSide) => {
            const [teamSide, statistics] = valueByTeamSide as [
              'home' | 'away',
              { time_str: string; val: string; created_at: string }[],
            ]

            return statistics.map((statistic, index) => {
              return {
                matchId,
                teamSide,
                type: type as StatisticType,
                timestamp: new Date(parseInt(statistic.created_at) * 1000),
                value: parseInt(statistic.val),
                matchTime: parseInt(statistic.time_str),
                staledAt: statistics[index + 1]
                  ? new Date(parseInt(statistics[index + 1].created_at) * 1000)
                  : null,
              }
            })
          })
          .flat()
      })
      .flat()
  }

  private defineMatchPeriods(matchStatistics: ExtendedStatistic[]) {
    const periods = matchStatistics.reduce(
      (acc, { timestamp, matchTime, type }) => {
        if (
          type === ('HALF_TIME_SCORE' as StatisticType) &&
          isBefore(timestamp, acc.firstHalfEnd)
        ) {
          acc.firstHalfEnd = timestamp
        }

        const isStatInSecondHalf = matchTime >= 60 && matchTime < 90
        if (isStatInSecondHalf) {
          const supposedSecondHalfStart = subMinutes(timestamp, matchTime - 45)

          if (isBefore(supposedSecondHalfStart, acc.secondHalfStart)) {
            acc.secondHalfStart = supposedSecondHalfStart
          }
        }

        const isStatInFirstHalf = matchTime >= 0 && matchTime < 45
        if (isStatInFirstHalf) {
          const supposedFirstHalfStart = subMinutes(timestamp, matchTime)

          if (isBefore(supposedFirstHalfStart, acc.supposedFirstHalfStart)) {
            acc.supposedFirstHalfStart = supposedFirstHalfStart
          }
        }
        return acc
      },
      {
        supposedFirstHalfStart: new Date('2030-01-01'),
        firstHalfEnd: new Date('2030-01-01'),
        secondHalfStart: new Date('2030-01-01'),
      },
    )

    // Since betsAPI has a weird behavior with the timestamps of minute 0 in statistics
    const { mostLikelyFirstHalfStart } = matchStatistics
      .filter((st) => st.matchTime === 0)
      .reduce(
        (acc, statistic) => {
          let timeCount = acc.possibleTimes.get(statistic.timestamp.getTime())

          if (timeCount) {
            acc.possibleTimes.set(statistic.timestamp.getTime(), timeCount + 1)
          } else {
            acc.possibleTimes.set(statistic.timestamp.getTime(), 1)
          }

          timeCount = acc.possibleTimes.get(statistic.timestamp.getTime())

          if (
            timeCount! >
            acc.possibleTimes.get(acc.mostLikelyFirstHalfStart.getTime())!
          ) {
            acc.mostLikelyFirstHalfStart = statistic.timestamp
          }

          return acc
        },
        {
          possibleTimes: new Map<number, number>([
            [periods.supposedFirstHalfStart.getTime(), 0],
          ]),
          mostLikelyFirstHalfStart: periods.supposedFirstHalfStart,
        },
      )

    if (isFuture(mostLikelyFirstHalfStart)) {
      console.log(matchStatistics)
    }
    if (
      differenceInMinutes(periods.firstHalfEnd, periods.secondHalfStart) <= 2 &&
      differenceInMinutes(periods.firstHalfEnd, periods.secondHalfStart) >= -2
    ) {
      // console.log('Adjusting periods: ', periods)
    } else {
      // console.log('Periods: ', periods)
    }

    return { ...periods, firstHalfStart: mostLikelyFirstHalfStart }
  }
}
