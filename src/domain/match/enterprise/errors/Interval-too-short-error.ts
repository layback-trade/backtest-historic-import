export class IntervalTooShortError extends Error {
  constructor() {
    super('Interval must last at least 5 minutes')
    this.name = 'IntervalTooShortError'
  }
}
