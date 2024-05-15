import { Entity } from '@/core/entity'
import { Optional } from '@/core/type-utils'

type ImportStatus = 'RUNNING' | 'FAILED' | 'COMPLETED'

interface EventImportProps {
  eventId: string
  createdAt: Date
  status: ImportStatus
  endedAt?: Date
  totalEvents?: number
  totalEventsWithMarket?: number
  eventsAdded?: number
}

interface EndProps {
  eventsAdded: number
  totalEvents: number
  totalEventsWithMarket: number
}

export class EventImport extends Entity<EventImportProps> {
  constructor(
    props: Optional<EventImportProps, 'createdAt' | 'endedAt' | 'status'>,
    id?: string,
  ) {
    super({ createdAt: new Date(), status: 'RUNNING', ...props }, id)
  }

  get eventId(): string {
    return this.props.eventId
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get status(): ImportStatus {
    return this.props.status
  }

  get endedAt(): Date | undefined {
    return this.props.endedAt
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
    this.props.eventsAdded = eventsAdded
    this.props.status = 'COMPLETED'
    this.props.totalEvents = totalEvents
    this.props.totalEventsWithMarket = totalEventsWithMarket
  }
}
