export class MarketWithoutInPlayDateError extends Error {
  constructor() {
    super('Market cannot be closed without inPlay date')
    this.name = 'MarketWithoutInPlayDateError'
  }
}
