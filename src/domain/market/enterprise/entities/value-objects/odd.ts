import { odds } from '@/infra/queue/workerHandlers/helpers/calculateOddGap'
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
    if (!odds.includes(value)) {
      throw new Error('Invalid odd value')
    }

    if (isFuture(timestamp) || isBefore(timestamp, '2020-01-01')) {
      throw new Error('Invalid odd timestamp')
    }

    this.value = value
    this.timestamp = timestamp
    this.selection = selection
  }
}
