import { isBefore } from 'date-fns'
import { Entity } from '../../../../core/entity'
import { Market } from './market'

interface EventProps {
  name: string
  scheduledStartDate: Date
  markets: Map<string, Market>
}

export class Event extends Entity<EventProps> {
  constructor(props: Omit<EventProps, 'markets'>, id: string) {
    if (!props.name.match(/^(.+) v (.+)$/)) {
      throw new Error('Invalid event name')
    }
    if (isBefore(props.scheduledStartDate, '2020-01-01')) {
      throw new Error('Start date too old')
    }
    super({ ...props, markets: new Map() }, id)
  }

  get name(): string {
    return this.props.name
  }

  get scheduledStartDate(): Date {
    return this.props.scheduledStartDate
  }

  addMarket(market: Market) {
    if (this.props.markets.has(market.id)) {
      throw new Error('Market duplicated')
    }

    this.props.markets.set(market.id, market)
  }

  getMarketById(marketId: string): Market {
    const market = this.props.markets.get(marketId)

    if (!market) {
      throw new Error('Market not found')
    }

    return market
  }

  get markets(): Map<string, Market> {
    return this.props.markets
  }
}
