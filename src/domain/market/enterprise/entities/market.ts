import { Optional } from '@/core/type-utils'
import { addMinutes, isAfter, isBefore } from 'date-fns'
import { Entity } from '../../../../core/entity'
import { MarketAlreadyClosedError } from '../errors/market-already-closed-error'
import { MarketStatusAlreadyDefinedError } from '../errors/market-status-already-defined-error'
import { MarketWithoutInPlayDateError } from '../errors/market-without-in-play-date-error'
import { MarketWithoutOddsError } from '../errors/market-without-odds-error'
import { MarketStatus, MarketStatusType } from './value-objects/market-status'
import { Odd } from './value-objects/odd'
import { Selection } from './value-objects/selection'

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
  selections: Selection[]
  odds: Odd[]
  createdAt: Date
  inPlayDate?: Date
  statusHistory: MarketStatus[]
  eventId: string
}

export class Market extends Entity<MarketProps> {
  constructor(
    props: Optional<MarketProps, 'odds' | 'inPlayDate' | 'statusHistory'>,
    id: string,
  ) {
    // // validation with selections
    // if (props.type === 'OVER_UNDER_05') {
    //   if (
    //     JSON.stringify(props.selections.map((selection) => selection.name)) !==
    //     JSON.stringify(['Under 0.5 Goals', 'Over 0.5 Goals'])
    //   ) {
    //     throw new Error('Invalid selections')
    //   }
    // }
    // if (props.type === 'MATCH_ODDS' || props.type === 'HALF_TIME') {
    //   if (
    //     props.selections.length !== 3 ||
    //     (!props.selections.some((selection) => selection.name === 'The Draw') &&
    //       !props.selections.some(
    //         (selection) => selection.name === 'The Draw (HT)',
    //       ))
    //   ) {
    //     throw new Error('Invalid selections')
    //   }
    // }

    const defaultStatus = new MarketStatus('OPEN', props.createdAt)
    super({ odds: [], statusHistory: [defaultStatus], ...props }, id)
  }

  get type() {
    return this.props.type
  }

  get eventId() {
    return this.props.eventId
  }

  get status() {
    return this.props.statusHistory.at(-1)!.name
  }

  get statusHistory() {
    return this.props.statusHistory
  }

  get suspendedTimes() {
    return this.statusHistory
      .filter((status) => status.name === 'SUSPENDED')
      .map((status) => ({
        startedAt: status.timestamp,
        finishedAt: this.statusHistory
          .slice(this.statusHistory.indexOf(status) + 1)
          .find((status) => status.name !== 'SUSPENDED')!.timestamp,
      }))
  }

  get createdAt() {
    return this.props.createdAt
  }

  get closedAt() {
    return this.isClosed ? this.statusHistory.at(-1)!.timestamp : null
  }

  get isClosed() {
    return this.status === 'CLOSED'
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

  get selectionsIds() {
    return this.props.selections.map((selection) => selection.id)
  }

  trade(odd: Odd) {
    if (this.isClosed) {
      throw new MarketAlreadyClosedError()
    }
    if (!this.selectionsIds.includes(odd.selection)) {
      throw new Error('Selection does not belong to this market')
    }
    if (isBefore(odd.timestamp, this.createdAt)) {
      throw new Error('Invalid odd time')
    }
    this.props.odds.push(odd)
  }

  turnInPlay(time: Date) {
    if (this.isClosed) {
      throw new MarketAlreadyClosedError()
    }
    if (isBefore(time, this.createdAt)) {
      throw new Error('Invalid inPlay time')
    }
    const selectionsWithoutPreliveOdd = this.props.selections.filter(
      (selection) =>
        !this.props.odds.some((odd) => odd.selection === selection.id),
    )
    selectionsWithoutPreliveOdd.forEach((selection) => {
      this.props.selections = this.props.selections.filter(
        (selection1) => selection1.id !== selection.id,
      )
    })
    // if (!hasOddsForAllSelections) {
    //   // throw new MarketWithoutPreliveOddsError()
    // }
    this.props.inPlayDate = time
  }

  doesMarketClosedWithoutInPlay() {
    return this.isClosed && !this.props.inPlayDate
  }

  doesMarketHasOddsInPlay() {
    if (!this.props.inPlayDate) {
      return false
    }
    const inPlayDate = this.props.inPlayDate
    return this.props.odds.some((odd) => isAfter(odd.timestamp, inPlayDate))
  }

  suspend(time: Date) {
    this.changeStatus('SUSPENDED', time)
  }

  reopen(time: Date) {
    this.changeStatus('OPEN', time)
  }

  close(time: Date) {
    if (this.props.odds.length === 0) {
      throw new MarketWithoutOddsError()
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
      // throw new Error('Market cannot be closed before 90 minutes')
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
      // throw new Error('Market cannot be closed before 90 minutes')
    }

    this.changeStatus('CLOSED', time)
  }

  private changeStatus(status: MarketStatusType, time: Date) {
    if (isBefore(time, this.createdAt)) {
      throw new Error('Invalid status time')
    }

    if (this.status === status) {
      throw new MarketStatusAlreadyDefinedError()
    }

    if (this.status === 'CLOSED') {
      throw new MarketAlreadyClosedError()
    }

    this.statusHistory.push(new MarketStatus(status, time))
  }
}
