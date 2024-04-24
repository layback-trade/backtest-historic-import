import { isBefore, isFuture } from 'date-fns'

interface SelectionProps {
  id: string
  selection: string
}

export class Selection {
  public readonly value: number
  public readonly timestamp: Date
  public readonly selection: string

  constructor({ value, timestamp, selection }: SelectionProps) {
    if (!selections.includes(value)) {
      throw new Error('Invalid selection value')
    }

    if (isFuture(timestamp) || isBefore(timestamp, '2020-01-01')) {
      throw new Error('Invalid selection timestamp')
    }

    this.value = value
    this.timestamp = timestamp
    this.selection = selection
  }
}
