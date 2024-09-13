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
      PrismaMatchMapper.getScores(statisticsToPersistence)

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

  private static getScores(statistics: PrismaStatistic[]) {
    const scores = statistics
      .filter((stat) => stat.type === 'GOAL' && stat.status !== 'CANCELED')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const lastScore = scores.at(-1)

    const HTScores = scores
      .filter((stat) => stat.gameTimeStatus === 'FIRST_HALF')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const HTScore = HTScores.at(-1)

    let homeTeamScore = 0
    let awayTeamScore = 0
    let homeTeamHTScore = 0
    let awayTeamHTScore = 0

    if (HTScore?.teamSide === 'home') {
      homeTeamHTScore = HTScore.value
      awayTeamHTScore = HTScore?.oppositeSideValue ?? 0
    } else if (HTScore?.teamSide === 'away') {
      awayTeamHTScore = HTScore.value
      homeTeamHTScore = HTScore?.oppositeSideValue ?? 0
    }

    if (lastScore?.teamSide === 'home') {
      homeTeamScore = lastScore.value
      awayTeamScore = lastScore?.oppositeSideValue ?? 0
    } else if (lastScore?.teamSide === 'away') {
      awayTeamScore = lastScore.value
      homeTeamScore = lastScore?.oppositeSideValue ?? 0
    }

    return {
      homeTeamHTScore,
      awayTeamHTScore,
      homeTeamScore,
      awayTeamScore,
    }
  }
}
