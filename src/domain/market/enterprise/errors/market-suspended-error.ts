export class MarketSuspendedError extends Error {
  constructor() {
    super('Cannot make changes to a suspended market.')
    this.name = 'MarketSuspendedError'
  }
}
