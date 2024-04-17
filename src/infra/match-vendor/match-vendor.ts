import {
  StatisticType,
  TeamSide,
} from '@/domain/match/enterprise/value-objects/statistic'

export interface MatchVendorResponse {
  id: string
  vendorMatchId: string
  firstHalfStart: Date
  firstHalfEnd: Date
  secondHalfStart: Date
  secondHalfEnd?: Date
  homeTeam: {
    id: string
    name: string
    cc: string
  }
  awayTeam: {
    id: string
    name: string
    cc: string
  }
  competition: {
    id: string
    name: string
    cc: string
  }
  statistics: {
    teamSide: TeamSide
    type: StatisticType
    value: number
    timestamp: Date
    staledAt: Date
    // matchTime: number // To think about
  }[]
}

export interface MatchVendor {
  fetchMatches(eventsId: string[]): Promise<MatchVendorResponse[]>
}
