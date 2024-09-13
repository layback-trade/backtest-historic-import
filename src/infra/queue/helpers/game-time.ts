import { differenceInSeconds, isAfter } from 'date-fns'

enum GamePeriod {
  PRELIVE = 0,
  FIRST_HALF = 1,
  INTERVAL = 1.5,
  SECOND_HALF = 2,
}

export type Periods = {
  firstHalfStart: Date
  firstHalfEnd: Date
  secondHalfStart: Date
}

export class GameTime {
  private _minute: number
  private _period: GamePeriod

  constructor(
    timestamp: Date,
    { firstHalfEnd, firstHalfStart, secondHalfStart }: Periods,
  ) {
    if (isAfter(timestamp, secondHalfStart)) {
      this._period = GamePeriod.SECOND_HALF
      this._minute =
        46 + Math.ceil(differenceInSeconds(timestamp, secondHalfStart) / 60)
    } else if (isAfter(timestamp, firstHalfEnd)) {
      this._period = GamePeriod.INTERVAL
      this._minute = Math.ceil(
        differenceInSeconds(timestamp, firstHalfEnd) / 60,
      )
    } else if (
      isAfter(timestamp, firstHalfStart) ||
      timestamp.getTime() === firstHalfStart.getTime()
    ) {
      this._period = GamePeriod.FIRST_HALF
      this._minute = Math.ceil(
        differenceInSeconds(timestamp, firstHalfStart) / 60,
      )
    } else {
      this._period = GamePeriod.PRELIVE
      this._minute = Math.ceil(
        differenceInSeconds(timestamp, firstHalfStart) / 60,
      )
    }

    if (this._minute > 120) {
      // throw new Error('Invalid minute.')
      console.error('Statistic after second half')
    }
    if (this.minute > 200) {
      // throw new Error('Invalid minute.')
      console.error('Invalid minute')
    }
  }

  get minute() {
    return this._minute
  }

  get period() {
    return this._period
  }
}
