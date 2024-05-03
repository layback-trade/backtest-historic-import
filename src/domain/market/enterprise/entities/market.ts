import { Optional } from '@/core/type-utils'
import { addMinutes, isAfter, isBefore } from 'date-fns'
import { Entity } from '../../../../core/entity'
import { MarketAlreadyClosedError } from '../errors/market-already-closed-error'
import { MarketSuspendedError } from '../errors/market-suspended-error'
import { MarketWithoutInPlayDateError } from '../errors/market-without-in-play-date-error'
import { MarketWithoutOddsError } from '../errors/market-without-odds-error'
import { Odd } from './value-objects/odd'

export type MarketStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED' // precisa ter o closed mesmo?
export type MarketType =
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
  eventId: string
}

export class Market extends Entity<MarketProps> {
  constructor(
    props: Optional<MarketProps, 'odds' | 'inPlayDate' | 'closedAt' | 'status'>,
    id: string,
  ) {
    // validation with selections
    if (props.type === 'OVER_UNDER_05') {
      if (
        JSON.stringify(props.selections) !==
        JSON.stringify(['Under 0.5 Goals', 'Over 0.5 Goals'])
      ) {
        throw new Error('Invalid selections')
      }
    }
    if (props.type === 'MATCH_ODDS' || props.type === 'HALF_TIME') {
      if (
        props.selections.length !== 3 ||
        (!props.selections.some((selection) => selection === 'The Draw') &&
          !props.selections.some((selection) => selection === 'The Draw (HT)'))
      ) {
        throw new Error('Invalid selections')
      }
    }
    super({ odds: [], status: 'OPEN', ...props }, id)
  }

  get type() {
    return this.props.type
  }

  get eventId() {
    return this.props.eventId
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

  get isClosed() {
    return this.props.status === 'CLOSED'
  }

  trade(odd: Odd) {
    if (this.props.closedAt) {
      throw new MarketAlreadyClosedError()
    }
    if (!this.props.selections.includes(odd.selection)) {
      throw new Error('Selection not belongs to this market')
    }
    if (isBefore(odd.timestamp, this.createdAt)) {
      throw new Error('Invalid odd time')
    }
    this.props.odds.push(odd)
  }

  turnInPlay(time: Date) {
    if (this.props.closedAt) {
      throw new MarketAlreadyClosedError()
    }
    if (isBefore(time, this.createdAt)) {
      throw new Error('Invalid inPlay time')
    }
    this.props.inPlayDate = time
  }

  doesMarketClosedWithoutInPlay() {
    return this.props.closedAt && !this.props.inPlayDate
  }

  doesMarketHasOddsPreInPlay() {
    if (!this.props.inPlayDate) {
      return this.props.odds.length > 0
    }
    const inPlayDate = this.props.inPlayDate
    return this.props.odds.some((odd) => isBefore(odd.timestamp, inPlayDate))
  }

  doesMarketHasOddsInPlay() {
    if (!this.props.inPlayDate) {
      return false
    }
    const inPlayDate = this.props.inPlayDate
    return this.props.odds.some((odd) => isAfter(odd.timestamp, inPlayDate))
  }

  suspend() {
    // if (isBefore(time, this.createdAt)) {
    //   throw new Error('Invalid suspending time')
    // }
    if (this.props.status === 'CLOSED') {
      throw new MarketAlreadyClosedError()
    }

    if (this.props.status === 'SUSPENDED') {
      throw new MarketSuspendedError()
    }

    this.props.status = 'SUSPENDED'
  }

  reopen() {
    // if (isBefore(time, this.createdAt)) {
    //   throw new Error('Invalid reopening time')
    // }
    if (this.props.status !== 'SUSPENDED') {
      if (this.props.status === 'CLOSED') {
        throw new MarketAlreadyClosedError()
      }
      throw new Error('Market cannot be opened if not suspended')
    }
    this.props.status = 'OPEN'
  }

  close(time: Date) {
    if (this.props.odds.length === 0) {
      throw new MarketWithoutOddsError()
    }

    if (this.props.status === 'CLOSED') {
      throw new MarketAlreadyClosedError()
    }

    if (!this.props.inPlayDate || isBefore(time, this.props.inPlayDate)) {
      throw new MarketWithoutInPlayDateError()
    }

    if (
      this.props.type === 'MATCH_ODDS' &&
      addMinutes(this.props.inPlayDate, 90) > time
    ) {
      console.log(
        'Mercado não pode ser fechado antes de 90 minutos',
        addMinutes(this.props.inPlayDate, 90),
        time,
      )
      throw new Error('Market cannot be closed before 90 minutes')
    }

    if (
      this.props.type === 'CORRECT_SCORE' &&
      addMinutes(this.props.inPlayDate, 90) > time
    ) {
      console.log(
        'Mercado não pode ser fechado antes de 90 minutos',
        addMinutes(this.props.inPlayDate, 90),
        time,
      )
      throw new Error('Market cannot be closed before 90 minutes')
    }

    this.props.closedAt = time
    this.props.status = 'CLOSED'
  }
}
