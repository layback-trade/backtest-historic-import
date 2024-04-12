import { isBefore, isFuture } from 'date-fns'

interface OddProps {
  value: number
  timestamp: Date
  selection: string
}

export class Odd {
  public readonly value: number
  public readonly timestamp: Date
  public readonly selection: string

  constructor({ value, timestamp, selection }: OddProps) {
    if (value > 1000 || value < 1.01) {
      throw new Error('Odd with invalid value')
    }

    if (isFuture(timestamp) || isBefore(timestamp, '2020-01-01')) {
      throw new Error('Odd timestamp invalid')
    }

    this.value = value
    this.timestamp = timestamp
    this.selection = selection
  }
}
