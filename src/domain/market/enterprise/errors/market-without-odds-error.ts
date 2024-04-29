export class MarketWithoutOddsError extends Error {
  constructor() {
    super('Market cannot be closed without odds')
    this.name = 'MarketWithoutOddsError'
  }
}
