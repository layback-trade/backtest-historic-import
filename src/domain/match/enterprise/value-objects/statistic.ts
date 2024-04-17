import { isBefore, isFuture } from 'date-fns'

export type TeamSide = 'home' | 'away'

export type StatisticType =
  | 'GOALS'
  | 'POSSESSION'
  | 'ATTACK'
  | 'CORNER'
  | 'DANGEROUS_ATTACK'
  | 'SUBSTITUTION'
  | 'PENALTY'
  | 'RED_CARD'
  | 'YELLOW_CARD'
  | 'SHOT'
  | 'SHOT_ON_TARGET'
  | 'SHOT_OFF_TARGET'

interface StatisticProps {
  teamSide: TeamSide
  type: StatisticType
  timestamp: Date
  value: number
}

export class Statistic {
  public readonly timestamp: Date
  public readonly teamSide: TeamSide
  public readonly type: StatisticType
  public readonly value: number

  constructor({ teamSide, timestamp, type, value }: StatisticProps) {
    if (isFuture(timestamp) || isBefore(timestamp, '2020-01-01')) {
      throw new Error('Invalid statistic timestamp')
    }

    const isValueInteger = value % 1 === 0
    if (!isValueInteger || value <= 0) {
      throw new Error('Invalid statistic value')
    }

    const isPercentageValue = type === 'POSSESSION'
    if (isPercentageValue && value > 100) {
      throw new Error('Invalid possession value')
    }

    this.timestamp = timestamp
    this.value = value
    this.teamSide = teamSide
    this.type = type
  }
}
