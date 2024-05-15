import { Entity } from '@/core/entity'
import { Optional } from '@/core/type-utils'
import { Period } from './value-objects/period'

type ImportStatus = 'RUNNING' | 'FAILED' | 'COMPLETED'

interface ImportProps {
  period: Period
  createdAt: Date
  status: ImportStatus
  endedAt?: Date
  eventsAdded?: number
  totalEvents?: number
  totalEventsWithMarket?: number
  // Reimporting?
  // New data?
  // current day? current data?
}

interface EndProps {
  eventsAdded: number
  totalEvents: number
  totalEventsWithMarket: number
}

export class Import extends Entity<ImportProps> {
  constructor(
    props: Optional<ImportProps, 'createdAt' | 'endedAt' | 'status'>,
    id?: string,
  ) {
    super({ createdAt: new Date(), status: 'RUNNING', ...props }, id)
  }

  get period(): Period {
    return this.props.period
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get endedAt(): Date | undefined {
    return this.props.endedAt
  }

  get status() {
    return this.props.status
  }

  get eventsAdded(): number | undefined {
    return this.props.eventsAdded
  }

  get totalEvents(): number | undefined {
    return this.props.totalEvents
  }

  get totalEventsWithMarket(): number | undefined {
    return this.props.totalEventsWithMarket
  }

  end({ eventsAdded, totalEvents, totalEventsWithMarket }: EndProps): void {
    if (this.props.endedAt) {
      throw new Error('Import already ended')
    }
    this.props.endedAt = new Date()
    this.props.status = 'COMPLETED'
    this.props.eventsAdded = eventsAdded
    this.props.totalEvents = totalEvents
    this.props.totalEventsWithMarket = totalEventsWithMarket
  }
}
