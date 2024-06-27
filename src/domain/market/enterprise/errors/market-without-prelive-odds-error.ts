export class MarketWithoutPreliveOddsError extends Error {
  constructor() {
    super('Market cannot turn inPlay without prelive odds for all selections')
    this.name = 'MarketWithoutPreliveOddsError'
  }
}
