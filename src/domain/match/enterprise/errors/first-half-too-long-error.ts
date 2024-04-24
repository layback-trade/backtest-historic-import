export class FirstHalfTooLongError extends Error {
  constructor() {
    super('First half must not last more than 60 minutes')
    this.name = 'FirstHalfTooLongError'
  }
}
