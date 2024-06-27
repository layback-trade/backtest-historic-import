import { odds } from '@/infra/queue/helpers/calculateOddGap'
import { isBefore, isFuture } from 'date-fns'

interface OddProps {
  value: number
  timestamp: Date
  selection: string
}

export class Odd {
  private readonly _value: number
  private readonly _timestamp: Date
  private readonly _selection: string

  constructor({ value, timestamp, selection }: OddProps) {
    if (!odds.includes(value)) {
      throw new Error('Invalid odd value')
    }

    if (isFuture(timestamp) || isBefore(timestamp, '2020-01-01')) {
      throw new Error('Invalid odd timestamp')
    }

    this._value = value
    this._timestamp = timestamp
    this._selection = selection
  }

  get value() {
    return this._value
  }

  get timestamp() {
    return this._timestamp
  }

  get selection() {
    return this._selection
  }
}
