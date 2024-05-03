import { isBefore } from 'date-fns'
import { Entity } from '../../../../core/entity'

interface EventProps {
  name: string
  scheduledStartDate: Date
}

export class Event extends Entity<EventProps> {
  constructor(props: EventProps, id: string) {
    if (!props.name.match(/^(.+) v (.+)$/)) {
      throw new Error('Invalid event name')
    }
    if (isBefore(props.scheduledStartDate, '2020-01-01')) {
      throw new Error('Start date too old')
    }
    super({ ...props }, id)
  }

  get name(): string {
    return this.props.name
  }

  get scheduledStartDate(): Date {
    return this.props.scheduledStartDate
  }
}
