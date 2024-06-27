import { Statistic } from '@/domain/match/enterprise/value-objects/statistic'
import {
  Event as PrismaEvent,
  Statistic as PrismaStatistic,
} from '@prisma/client'
import { PrismaStatisticsMapper } from './prisma-statistics-mapper'

type MatchInput = {
  id: string
  awayTeamId: string
  competitionId: string
  firstHalfStart: Date
  homeTeamId: string
  secondHalfStart: Date
  firstHalfEnd: Date
  // secondHalfEnd: Date
  statistics: Statistic[]
}

interface PrismaMatchMapperInput {
  match: MatchInput
  event: {
    name: string
    scheduledStartDate: Date
  }
}

interface PrismaMatchMapperOutput {
  match: PrismaEvent
  statistics: PrismaStatistic[]
}

export class PrismaMatchMapper {
  static toPersistence({
    match,
    event,
  }: PrismaMatchMapperInput): PrismaMatchMapperOutput {
    const statisticsToPersistence = PrismaStatisticsMapper.toPersistence(
      match.statistics,
      {
        id: match.id,
        firstHalfStart: match.firstHalfStart,
        secondHalfStart: match.secondHalfStart!,
        firstHalfEnd: match.firstHalfEnd!,
      },
    )

    const { awayTeamHTScore, awayTeamScore, homeTeamHTScore, homeTeamScore } =
      PrismaMatchMapper.getScores(match, statisticsToPersistence)

    return {
      match: {
        id: Number(match.id),
        name: event.name,
        startDate: event.scheduledStartDate,
        awayTeamId: Number(match.awayTeamId),
        competitionId: Number(match.competitionId),
        firstHalfStart: match.firstHalfStart,
        homeTeamId: Number(match.homeTeamId),
        firstHalfEnd: match.firstHalfEnd ?? null,
        secondHalfStart: match.secondHalfStart ?? null,
        awayTeamHTScore,
        homeTeamHTScore,
        homeTeamScore,
        awayTeamScore,
        secondHalfEnd: null,
      },
      statistics: statisticsToPersistence,
    }
  }

  private static getScores(match: MatchInput, statistics: PrismaStatistic[]) {
    const lastScore = statistics.filter((stat) => stat.type === 'GOAL').at(-1)

    const HTScore = statistics
      .filter(
        (stat) =>
          stat.type === 'GOAL' &&
          stat.createdAt.getTime() < match.firstHalfEnd!.getTime(),
      )
      .at(-1)

    return {
      homeTeamHTScore: HTScore?.teamSide === 'home' ? HTScore.value : 0,
      awayTeamHTScore: HTScore?.teamSide === 'away' ? HTScore.value : 0,
      homeTeamScore: lastScore?.teamSide === 'home' ? lastScore.value : 0,
      awayTeamScore: lastScore?.teamSide === 'away' ? lastScore.value : 0,
    }
  }
}
