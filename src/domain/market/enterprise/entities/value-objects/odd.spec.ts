import { addDays, subDays } from 'date-fns'
import { Odd } from './odd'

describe('Odd', () => {
  let timestamp: Date
  let value: number
  let selection: string

  beforeEach(() => {
    timestamp = new Date()
    value = 1.25
    selection = 'Over 2.5'
  })

  it('should throw an error if the timestamp is in the future', () => {
    timestamp = addDays(new Date(), 1) // Future date

    expect(() => new Odd({ timestamp, value, selection })).toThrow(
      'Invalid odd timestamp',
    )
  })

  it('should throw an error if the timestamp is before 2020-01-01', () => {
    timestamp = subDays(new Date('2020-01-01'), 1) // Date before 2020-01-01

    expect(() => new Odd({ timestamp, selection, value })).toThrow(
      'Invalid odd timestamp',
    )
  })

  it('should throw an error if the value is not a valid price', () => {
    value = 40.2

    expect(() => new Odd({ selection, timestamp, value })).toThrow(
      'Invalid odd value',
    )
  })
})
