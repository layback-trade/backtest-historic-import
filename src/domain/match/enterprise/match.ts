import { isBefore, isFuture } from 'date-fns'
import { Entity } from '../../../core/entity'
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
    props: Omit<
      MatchProps,
      | 'endDate'
      | 'statistics'
      | 'firstHalfEnd'
      | 'secondHalfStart'
      | 'secondHalfEnd'
    >,
    id: string,
  ) {
    if (isFuture(props.firstHalfStart)) {
      throw new Error('Match cannot start in the future')
    }
    super({ ...props, statistics: [] }, id)
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

  endFirstHalf(time: Date) {
    if (isBefore(time, this.props.firstHalfStart)) {
      throw new Error('First half end must not be earlier than the start')
    }
    if (this.props.firstHalfEnd) {
      throw new Error('First half already ended')
    }
    this.props.firstHalfEnd = time
  }

  startSecondHalf(time: Date) {
    if (this.props.secondHalfStart) {
      throw new Error('Second half already started')
    }
    if (!this.props.firstHalfEnd) {
      throw new Error('First half not ended yet')
    }
    // if (isBefore(time, this.props.firstHalfEnd)) {
    //   throw new Error(
    //     'Second half start must not be later than the first half ending',
    //   )
    // }
    this.props.secondHalfStart = time
  }

  endSecondHalf(time: Date) {
    if (!this.props.secondHalfStart) {
      throw new Error('Second half not started yet')
    }
    if (this.props.secondHalfEnd) {
      throw new Error('Second half already ended')
    }
    if (isBefore(time, this.props.secondHalfStart)) {
      throw new Error('Second half end must not be earlier than the start')
    }
    this.props.secondHalfEnd = time
  }

  getStatisticsFromFirstHalf() {
    const { firstHalfEnd } = this.props
    if (!firstHalfEnd) {
      throw new Error('First half not ended yet')
    }

    return this.props.statistics.filter((statistic) =>
      isBefore(statistic.timestamp, firstHalfEnd),
    )
  }

  getStatisticsFromSecondHalf() {
    const { secondHalfEnd } = this.props
    if (!secondHalfEnd) {
      throw new Error('Second half not ended yet')
    }

    return this.props.statistics.filter((statistic) =>
      isBefore(statistic.timestamp, secondHalfEnd),
    )
  }

  getLastStatisticFromType(type: StatisticType) {
    return this.props.statistics
      .filter((statistic) => statistic.type === type)
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
    // should validate the last statistic and compare the values?
    // should sort?
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
