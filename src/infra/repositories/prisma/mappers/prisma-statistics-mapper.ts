import {
  Statistic,
  StatisticTypeEnum,
} from '@/domain/match/enterprise/value-objects/statistic'
import { GameTime } from '@/infra/queue/helpers/game-time'
import { Statistic as PrismaStatistic } from '@prisma/client'

const gameTimeStatusMap = {
  0: 'PRELIVE',
  1: 'FIRST_HALF',
  1.5: 'INTERVAL',
  2: 'SECOND_HALF',
}

enum PrismaStatisticStatus {
  REGULAR = 'REGULAR',
  CANCELED = 'CANCELED',
  RECALCULATED = 'RECALCULATED',
}

export class PrismaStatisticsMapper {
  static toPersistence(
    statistics: Statistic[],
    {
      id: matchId,
      firstHalfStart,
      secondHalfStart,
      firstHalfEnd,
    }: {
      id: string
      firstHalfStart: Date
      secondHalfStart: Date
      firstHalfEnd: Date
    },
  ): PrismaStatistic[] {
    // Filter out invalid statistic types first
    const validStatistics = statistics.filter((stat) => {
      const validStatisticType = Object.values(StatisticTypeEnum).includes(
        stat.type as StatisticTypeEnum,
      )
      return validStatisticType
    })

    // Group statistics by combination of fields to identify duplicates
    const uniqueStatsMap = new Map<string, Statistic>()

    validStatistics.forEach((stat) => {
      if (stat.type !== 'GOAL') {
        return
      }
      const gameTime = new GameTime(stat.timestamp, {
        firstHalfStart,
        secondHalfStart,
        firstHalfEnd,
      })

      if (stat.type === 'GOAL') {
        console.log({
          stat,
          gameTime,
          uniqueStatsMap,
        })
      }

      // Create a unique key for grouping
      const key = `${stat.teamSide}-${stat.type}-${gameTime.minute}-${gameTime.period.toFixed(1)}`

      // If this combination doesn't exist yet or current stat is older, save it
      if (
        !uniqueStatsMap.has(key) ||
        stat.timestamp > uniqueStatsMap.get(key)!.timestamp
      ) {
        uniqueStatsMap.set(key, stat)
      }
    })

    // Convert map values back to array
    const dedupedStatistics = Array.from(uniqueStatsMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    )

    return dedupedStatistics.map((stat) => {
      const oppositeSideStat = dedupedStatistics
        .filter(
          (s) =>
            s.teamSide !== stat.teamSide &&
            s.type === stat.type &&
            s.timestamp < stat.timestamp,
        )
        .at(-1)

      const nextStatSameSide = dedupedStatistics.find(
        (s) =>
          s.teamSide === stat.teamSide &&
          s.type === stat.type &&
          s.timestamp > stat.timestamp,
      )

      const nextStat = dedupedStatistics.find(
        (s) => s.type === stat.type && s.timestamp > stat.timestamp,
      )

      const prevStat = dedupedStatistics
        .filter(
          (s) =>
            s.teamSide === stat.teamSide &&
            s.type === stat.type &&
            s.timestamp < stat.timestamp,
        )
        .at(-1)

      let status = PrismaStatisticStatus.REGULAR

      if (stat.type !== 'POSSESSION') {
        if (nextStatSameSide && nextStatSameSide.value < stat.value) {
          status = PrismaStatisticStatus.CANCELED
        } else if (prevStat && prevStat.value > stat.value) {
          status = PrismaStatisticStatus.RECALCULATED
        }
      }

      const gameTime = new GameTime(stat.timestamp, {
        firstHalfStart,
        secondHalfStart,
        firstHalfEnd,
      })

      return {
        teamSide: stat.teamSide,
        createdAt: stat.timestamp,
        gameTime: gameTime.minute,
        gameTimePeriod: Number(gameTime.period.toFixed(1)),
        gameTimeStatus: gameTimeStatusMap[gameTime.period],
        type: stat.type,
        originalGameTime: -1,
        value: stat.value,
        oppositeSideValue: oppositeSideStat?.value
          ? stat.type === 'POSSESSION'
            ? 100 - stat.value
            : oppositeSideStat.value
          : stat.type === 'POSSESSION'
            ? 100 - stat.value
            : 0,
        staledAt: nextStat?.timestamp ?? new Date('2050-01-01'),
        status,
        eventId: Number(matchId),
      }
    })
  }
}
