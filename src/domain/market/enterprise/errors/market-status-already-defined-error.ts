export class MarketStatusAlreadyDefinedError extends Error {
  constructor() {
    super('Cannot change the market status to the same status')
    this.name = 'MarketStatusAlreadyDefined'
  }
}
