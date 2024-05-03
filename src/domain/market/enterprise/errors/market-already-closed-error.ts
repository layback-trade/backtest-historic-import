export class MarketAlreadyClosedError extends Error {
  constructor() {
    super('Cannot make changes to a closed market.')
    this.name = 'MarketAlreadyClosedError'
  }
}
