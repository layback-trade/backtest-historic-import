export type MarketStatusType = 'OPEN' | 'SUSPENDED' | 'CLOSED'

export class MarketStatus {
  constructor(
    public readonly name: MarketStatusType,
    public readonly timestamp: Date,
  ) {}
}
