import { isBefore } from 'date-fns'
import { Entity } from '../../../../core/entity'
import { Odd } from './value-objects/odd'

type MarketStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED' // precisa ter o closed mesmo?
type MarketType =
  | 'MATCH_ODDS'
  | 'CORRECT_SCORE'
  | 'BOTH_TEAMS_TO_SCORE'
  | 'OVER_UNDER_05'
  | 'OVER_UNDER_15'
  | 'OVER_UNDER_25'
  | 'OVER_UNDER_35'
  | 'OVER_UNDER_45'
  | 'OVER_UNDER_55'
  | 'OVER_UNDER_65'
  | 'HALF_TIME'
  | 'FIRST_HALF_GOALS_05'
  | 'FIRST_HALF_GOALS_15'

interface MarketProps {
  type: MarketType
  selections: string[]
  odds: Odd[]
  createdAt: Date
  inPlayDate?: Date
  closedAt?: Date
  status: MarketStatus // Times,
}

export class Market extends Entity<MarketProps> {
  constructor(
    props: Omit<MarketProps, 'odds' | 'inPlayDate' | 'closedAt' | 'status'>,
    id: string,
  ) {
    super({ ...props, odds: [], status: 'OPEN' }, id)
  }

  get type() {
    return this.props.type
  }

  get status() {
    return this.props.status
  }

  get createdAt() {
    return this.props.createdAt
  }

  get closedAt() {
    return this.props.closedAt
  }

  get inPlayDate() {
    return this.props.inPlayDate
  }

  get odds() {
    return this.props.odds
  }

  get selections() {
    return this.props.selections
  }

  trade(odd: Odd) {
    if (this.props.closedAt) {
      throw new Error('Market already closed')
    }
    if (!this.props.selections.includes(odd.selection)) {
      throw new Error('Selection not belongs this market')
    }
    if (isBefore(odd.timestamp, this.props.createdAt)) {
      throw new Error('Invalid odd time')
    }
    this.props.odds.push(odd)
  }

  turnInPlay(time: Date) {
    if (this.props.closedAt) {
      throw new Error('Market already closed')
    }
    if (isBefore(time, this.props.createdAt)) {
      throw new Error('Invalid inPlay time')
    }
    this.props.inPlayDate = time
  }

  doesMarketClosedWithoutInPlay() {
    return this.props.closedAt && !this.props.inPlayDate
  }

  doesMarketHasOddsNotInPlay() {
    if (!this.props.inPlayDate) {
      return this.props.odds.length > 0
    }
    const inPlayDate = this.props.inPlayDate
    return this.props.odds.some((odd) => isBefore(odd.timestamp, inPlayDate))
  }

  suspend() {
    this.props.status = 'SUSPENDED'
  }

  close(time: Date) {
    if (isBefore(time, this.props.createdAt)) {
      throw new Error('Invalid close time')
    }
    // if closed && !this.props.inPlayAt => No ODD
    this.props.closedAt = time
    this.props.status = 'CLOSED'
  }
}
