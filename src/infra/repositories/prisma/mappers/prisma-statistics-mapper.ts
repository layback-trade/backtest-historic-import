import { Statistic, StatisticTypeEnum } from '@/domain/match/enterprise/value-objects/statistic'
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
    return statistics
      .filter((stat) => {
        const validStatisticType = Object.values(StatisticTypeEnum).includes(
          stat.type as StatisticTypeEnum,
        )

        return validStatisticType
      })
      .map((stat) => {
        const oppositeSideStat = statistics
          .filter(
            (s) =>
              s.teamSide !== stat.teamSide &&
              s.type === stat.type &&
              s.timestamp < stat.timestamp,
          )
          .at(-1)

        const nextStatSameSide = statistics.find(
          (s) =>
            s.teamSide === stat.teamSide &&
            s.type === stat.type &&
            s.timestamp > stat.timestamp,
        )

        const nextStat = statistics.find(
          (s) => s.type === stat.type && s.timestamp > stat.timestamp,
        )

        const prevStat = statistics
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
          gameTimePeriod: gameTime.period,
          gameTimeStatus: gameTimeStatusMap[gameTime.period],
          type: stat.type,
          originalGameTime: -1,
          value: stat.value,
          oppositeSideValue:
            oppositeSideStat?.value ? stat.type === 'POSSESSION'
              ? 100 - stat.value
              : stat.value : 0,
          staledAt: nextStat?.timestamp ?? new Date('2050-01-01'),
          status,
          eventId: Number(matchId),
        }
      })
  }
}
