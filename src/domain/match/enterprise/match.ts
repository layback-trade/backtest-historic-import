import { Optional } from '@/core/type-utils'
import { differenceInMinutes, isBefore, isFuture } from 'date-fns'
import { Entity } from '../../../core/entity'
import { IntervalTooShortError } from './errors/Interval-too-short-error'
import { FirstHalfTooLongError } from './errors/first-half-too-long-error'
import { Statistic, StatisticType } from './value-objects/statistic'

interface MatchProps {
  // HTScore: Score
  // endScore: Score
  homeTeamId: string
  awayTeamId: string
  competitionId: string
  firstHalfStart: Date
  firstHalfEnd?: Date
  secondHalfStart?: Date
  secondHalfEnd?: Date
  statistics: Statistic[]
  // períodos?
}

export class Match extends Entity<MatchProps> {
  constructor(
    props: Optional<
      MatchProps,
      'statistics' | 'firstHalfEnd' | 'secondHalfStart' | 'secondHalfEnd'
    >,
    id: string,
  ) {
    if (isFuture(props.firstHalfStart)) {
      throw new Error('Match cannot start in the future')
    }
    if (isBefore(props.firstHalfStart, '2020-01-01')) {
      throw new Error('Match cannot start before 2020')
    }
    super({ statistics: [], ...props }, id)
  }

  get firstHalfStart() {
    return this.props.firstHalfStart
  }

  get firstHalfEnd() {
    return this.props.firstHalfEnd
  }

  get secondHalfStart() {
    return this.props.secondHalfStart
  }

  get secondHalfEnd() {
    return this.props.secondHalfEnd
  }

  get statistics() {
    return this.props.statistics
  }

  get homeTeamId() {
    return this.props.homeTeamId
  }

  get awayTeamId() {
    return this.props.awayTeamId
  }

  get competitionId() {
    return this.props.competitionId
  }

  get period() {
    if (!this.props.firstHalfEnd) {
      return 'FIRST_HALF'
    } else if (!this.props.secondHalfStart) {
      return 'INTERVAL'
    } else if (!this.props.secondHalfEnd) {
      return 'SECOND_HALF'
    }
    return 'ENDED'
  }

  get doesMatchHaveStatistics() {
    return this.props.statistics.length > 0
  }

  get statisticsFromFirstHalf() {
    const { firstHalfEnd } = this.props
    if (!firstHalfEnd) {
      throw new Error('First half not ended yet')
    }

    return this.props.statistics.filter((statistic) =>
      isBefore(statistic.timestamp, firstHalfEnd),
    )
  }

  get statisticsFromSecondHalf() {
    const { secondHalfEnd } = this.props
    if (!secondHalfEnd) {
      throw new Error('Second half not ended yet')
    }

    return this.props.statistics.filter((statistic) =>
      isBefore(statistic.timestamp, secondHalfEnd),
    )
  }

  endFirstHalf(timestamp: Date) {
    if (isBefore(timestamp, this.props.firstHalfStart)) {
      throw new Error('First half end must not be earlier than the start')
    }
    if (this.props.firstHalfEnd) {
      throw new Error('First half already ended')
    }
    if (this.props.statistics.length === 0) {
      throw new Error('Match must have at least one statistic')
      // Flag no evento e salva
    }
    if (differenceInMinutes(timestamp, this.props.firstHalfStart) < 45) {
      throw new Error('First half must last at least 45 minutes')
    }
    if (differenceInMinutes(timestamp, this.props.firstHalfStart) > 60) {
      throw new FirstHalfTooLongError()
    }
    this.props.firstHalfEnd = timestamp
  }

  startSecondHalf(timestamp: Date) {
    if (this.props.secondHalfStart) {
      throw new Error('Second half already started')
    }
    if (!this.props.firstHalfEnd) {
      throw new Error('First half not ended yet')
    }
    if (isBefore(timestamp, this.props.firstHalfEnd)) {
      throw new Error(
        'Second half start must be later than the first half ending',
      )
    }
    if (differenceInMinutes(timestamp, this.props.firstHalfEnd) < 5) {
      throw new IntervalTooShortError()
    }
    if (differenceInMinutes(timestamp, this.props.firstHalfEnd) > 25) {
      throw new Error('Interval must not last more than 25 minutes')
    }
    this.props.secondHalfStart = timestamp
  }

  endSecondHalf(timestamp: Date) {
    if (!this.props.secondHalfStart) {
      throw new Error('Second half not started yet')
    }
    if (this.props.secondHalfEnd) {
      throw new Error('Second half already ended')
    }
    if (isBefore(timestamp, this.props.secondHalfStart)) {
      throw new Error('Second half end must not be earlier than the start')
    }
    if (differenceInMinutes(timestamp, this.props.secondHalfStart) < 45) {
      throw new Error('Second half must last at least 45 minutes')
    }
    if (differenceInMinutes(timestamp, this.props.secondHalfStart) > 60) {
      throw new Error('Second half must not last more than 60 minutes')
    }
    this.props.secondHalfEnd = timestamp
  }

  getLastStatisticFromType(type: StatisticType, teamSide: 'home' | 'away') {
    return this.props.statistics
      .filter(
        (statistic) =>
          statistic.type === type && statistic.teamSide === teamSide,
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
  }
  // TO-DO: More methods

  // getHTScore(): Score {
  //   return this.props.HTScore
  // }

  // getEndScore(): Score {
  //   return this.props.endScore
  // }

  registerNewStatistic(statistic: Statistic) {
    switch (this.period) {
      case 'FIRST_HALF':
        if (isBefore(statistic.timestamp, this.firstHalfStart)) {
          return
          // throw new Error(
          //   'Statistic cannot be registered before the match starts',
          // )
        }
        break
      case 'INTERVAL':
        // if (isAfter(statistic.timestamp, this.firstHalfEnd!)) {
        // throw new Error('Statistic cannot be registered during the interval')
        // }
        break
      case 'SECOND_HALF':
        // if (isBefore(statistic.timestamp, this.secondHalfStart!)) {
        //   throw new Error(
        //     'Statistic cannot be registered before the second half starts',
        //   )
        // }
        break
      case 'ENDED':
        throw new Error(
          'Statistic cannot be registered after the second half end',
        )
    }
    // should not be able to register a statistic if the value is less or equal than the last one
    const lastStatistic = this.getLastStatisticFromType(
      statistic.type,
      statistic.teamSide,
    )

    if (
      lastStatistic &&
      statistic.type !== 'GOALS' &&
      statistic.type !== 'POSSESSION' &&
      statistic.value < lastStatistic.value
    ) {
      // throw new Error('Invalid statistic value')
      return
    }

    // should validate the last statistic and compare the values?
    // should sort?
    // should validate if its duplicated? or if the value is less than the last one?
    this.props.statistics.push(statistic)
  }

  getCurrentScore() {
    // this.props.statistics.sort(
    //   (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    // )
    // const score = {
    //   score
    // }
    // this.props.statistics.reduce(
    //   (statistic) => statistic.type === 'GOALS' && statistic.type,
    // )
    // // probably not necessary if you get the last ones
    // const [lastGoal,] = goals.slice(0, 1)
    // return
    // return score.slice(score.length -1, g)
  }
}
