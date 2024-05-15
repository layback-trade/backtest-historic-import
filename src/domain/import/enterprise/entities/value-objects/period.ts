import { eachDayOfInterval } from 'date-fns'

export class Period {
  private start: Date
  private end: Date

  constructor(start: Date, end: Date) {
    if (start > end) {
      throw new Error('Invalid period')
    }
    if (start < new Date('2015-01-01')) {
      throw new Error('Start date is before 2015-01-01')
    }
    if (end > new Date('2030-01-01')) {
      throw new Error('End date is after 2020-01-01')
    }

    this.start = start
    this.end = end
  }

  get startDate(): Date {
    return this.start
  }

  get endDate(): Date {
    return this.end
  }

  get startDayNumber(): number {
    return this.start.getDate()
  }

  get startMonthNumber(): number {
    return this.start.getMonth() + 1
  }

  get startYearNumber(): number {
    return this.start.getFullYear()
  }

  get endDayNumber(): number {
    return this.end.getDate()
  }

  get endMonthNumber(): number {
    return this.end.getMonth() + 1
  }

  get endYearNumber(): number {
    return this.end.getFullYear()
  }

  get allDaysInPeriod(): Date[] {
    return eachDayOfInterval({ start: this.startDate, end: this.endDate })
  }
}
