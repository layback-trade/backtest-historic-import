import { addDays, subDays } from 'date-fns'
import { Statistic, StatisticType, TeamSide } from './statistic'

describe('Statistic', () => {
  let teamSide: TeamSide
  let type: StatisticType
  let timestamp: Date
  let value: number

  beforeEach(() => {
    teamSide = 'home'
    type = 'GOALS'
    timestamp = new Date()
    value = 1
  })

  it('should throw an error if the timestamp is in the future', () => {
    timestamp = addDays(new Date(), 1) // Future date

    expect(() => new Statistic({ teamSide, timestamp, type, value })).toThrow(
      'Invalid statistic timestamp',
    )
  })

  it('should throw an error if the timestamp is before 2020-01-01', () => {
    timestamp = subDays(new Date('2020-01-01'), 1) // Date before 2020-01-01

    expect(() => new Statistic({ teamSide, timestamp, type, value })).toThrow(
      'Invalid statistic timestamp',
    )
  })

  it('should throw an error if the value is not an integer', () => {
    value = 1.5 // Not an integer

    expect(() => new Statistic({ teamSide, timestamp, type, value })).toThrow(
      'Invalid statistic value',
    )
  })

  it('should throw an error if the value is less than or equal to 0', () => {
    value = 0 // Less than or equal to 0

    expect(() => new Statistic({ teamSide, timestamp, type, value })).toThrow(
      'Invalid statistic value',
    )
  })

  it('should throw an error if the type is POSSESSION and the value is greater than 100', () => {
    type = 'POSSESSION'
    value = 101 // Greater than 100

    expect(() => new Statistic({ teamSide, timestamp, type, value })).toThrow(
      'Invalid possession value',
    )
  })
})
