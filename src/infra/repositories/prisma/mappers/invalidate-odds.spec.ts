import { Market } from '@/domain/market/enterprise/entities/market'
import { Odd } from '@/domain/market/enterprise/entities/value-objects/odd'
import { Selection } from '@/domain/market/enterprise/entities/value-objects/selection'
import { Statistic as PrismaStatistic } from '@prisma/client'
import { PrismaOddsMapper2 } from './prisma-odds.mapper'

describe('Invalidade odds', () => {
  it('should suspend market when there is a goal', () => {
    // expect that should not exist any artificial odd with open status if the previous one was suspended
    const market = new Market(
      {
        selections: [
          new Selection('1', 'team 1'),
          new Selection('2', 'team 2'),
          new Selection('3', 'The Draw'),
        ],
        eventId: '1',
        type: 'MATCH_ODDS',
        odds: [
          new Odd({
            selection: '1',
            value: 1.5,
            timestamp: new Date('2022-04-23T12:00:00Z'),
          }),
          new Odd({
            selection: '1',
            value: 1.54,
            timestamp: new Date('2022-04-23T12:01:00Z'),
          }),
          new Odd({
            selection: '1',
            value: 1.17,
            timestamp: new Date('2022-04-23T12:04:00Z'),
          }),
        ],
        createdAt: new Date('2022-04-23T11:00:00Z'),
      },
      '1',
    )
    const goals: PrismaStatistic[] = [
      {
        teamSide: 'home',
        createdAt: new Date('2022-04-23T12:00:25Z'),
        oppositeSideValue: 0,
        staledAt: new Date('2050-01-01T00:00:00Z'),
        eventId: 1,
        value: 1,
        type: 'GOAL',
        gameTime: 0,
        gameTimeStatus: 'FIRST_HALF',
        gameTimePeriod: 0,
        status: 'REGULAR',
        originalGameTime: -1
      },
    ]

    const mapper = new PrismaOddsMapper2(
      market.odds.map((odd) => ({
        selection: odd.selection,
        value: odd.value,
        timestamp: odd.timestamp,
        marketId: market.id,
      })),
      {
        firstHalfStart: new Date('2022-04-23T12:00:00Z'),
        firstHalfEnd: new Date('2022-04-23T12:45:00Z'),
        secondHalfStart: new Date('2022-04-23T13:00:00Z'),
      },
    )

    const oddsFormatted = mapper.toPersistence(new Date('2022-04-23T13:45:00Z'))
    const invalidateOdds = new InvalidateOdds(market, goals, oddsFormatted)
    const oddsWithStatus = invalidateOdds.invalidateAll()

    // expect that should not exist any artificial odd with open status if the previous one was suspended
    expect(oddsWithStatus[1].marketStatus).toBe('SUSPENDED')
    expect(oddsWithStatus[2].marketStatus).toBe('OPEN')
  })

  it('should set an odd to 1000 when the selection turns impossible but the market is still open', () => {
    const market = new Market(
      {
        selections: [
          new Selection('1', 'team 1'),
          new Selection('2', 'team 2'),
          new Selection('3', 'The Draw'),
        ],
        eventId: '1',
        type: 'CORRECT_SCORE',
        odds: [
          new Odd({
            selection: '1',
            value: 1.5,
            timestamp: new Date('2022-04-23T12:00:00Z'),
          }),
          new Odd({
            selection: '1',
            value: 1.54,
            timestamp: new Date('2022-04-23T12:01:00Z'),
          }),
          new Odd({
            selection: '1',
            value: 1.17,
            timestamp: new Date('2022-04-23T12:04:00Z'),
          }),
        ],
        createdAt: new Date('2022-04-23T11:00:00Z'),
      },
      '1',
    )
    const goals: PrismaStatistic[] = [
      {
        teamSide: 'home',
        createdAt: new Date('2022-04-23T12:03:25Z'),
        oppositeSideValue: 0,
        gameTime: 0,
        gameTimeStatus: 'FIRST_HALF',
        gameTimePeriod: 0,
        staledAt: new Date('2050-01-01T00:00:00Z'),
        eventId: 1,
        value: 1,
        type: 'GOAL',
        status: 'REGULAR',
      },
    ]

    const mapper = new PrismaOddsMapper2(
      market.odds.map((odd) => ({
        selection: odd.selection,
        value: odd.value,
        timestamp: odd.timestamp,
        marketId: market.id,
      })),
      {
        firstHalfStart: new Date('2022-04-23T12:00:00Z'),
        firstHalfEnd: new Date('2022-04-23T12:45:00Z'),
        secondHalfStart: new Date('2022-04-23T13:00:00Z'),
      },
    )

    const oddsFormatted = mapper.toPersistence(new Date('2022-04-23T13:45:00Z'))
    const invalidateOdds = new InvalidateOdds(market, goals, oddsFormatted)
    const oddsWithOdd1000Defined = invalidateOdds.setThousand()

    expect(oddsWithOdd1000Defined[4].odd).toBe(1000)
  })

  it('should set odd marketStatus to CLOSED when the odd is impossible in market of type that depends on goals', () => {
    const market = new Market(
      {
        selections: [
          new Selection('4', 'Over 2.5'),
          new Selection('5', 'Under 2.5'),
        ],
        eventId: '1',
        type: 'OVER_UNDER_25',
        odds: [
          new Odd({
            selection: '4',
            value: 1.5,
            timestamp: new Date('2022-04-23T12:00:00Z'),
          }),
          new Odd({
            selection: '4',
            value: 1.54,
            timestamp: new Date('2022-04-23T12:01:00Z'),
          }),
          new Odd({
            selection: '4',
            value: 1.17,
            timestamp: new Date('2022-04-23T12:04:00Z'),
          }),
        ],
        createdAt: new Date('2022-04-23T11:00:00Z'),
      },
      '1',
    )

    const goals: PrismaStatistic[] = [
      {
        teamSide: 'home',
        createdAt: new Date('2022-04-23T12:03:25Z'),
        gameTime: 0,
        gameTimeStatus: 'FIRST_HALF',
        gameTimePeriod: 0,
        oppositeSideValue: 0,
        staledAt: new Date('2022-04-23T12:12:25Z'),
        eventId: 1,
        value: 1,
        type: 'GOAL',
        status: 'REGULAR',
      },
      {
        teamSide: 'home',
        createdAt: new Date('2022-04-23T12:12:25Z'),
        gameTime: 0,
        gameTimeStatus: 'FIRST_HALF',
        gameTimePeriod: 0,
        oppositeSideValue: 0,
        staledAt: new Date('2022-04-23T12:40:25Z'),
        eventId: 1,
        value: 2,
        type: 'GOAL',
        status: 'REGULAR',
      },
      {
        teamSide: 'away',
        createdAt: new Date('2022-04-23T12:40:25Z'),
        gameTime: 0,
        gameTimeStatus: 'FIRST_HALF',
        gameTimePeriod: 0,
        oppositeSideValue: 2,
        staledAt: new Date('2050-01-01T00:00:00Z'),
        eventId: 1,
        value: 1,
        type: 'GOAL',
        status: 'REGULAR',
      },
    ]

    const mapper = new PrismaOddsMapper2(
      market.odds.map((odd) => ({
        selection: odd.selection,
        value: odd.value,
        timestamp: odd.timestamp,
        marketId: market.id,
      })),
      {
        firstHalfStart: new Date('2022-04-23T12:00:00Z'),
        firstHalfEnd: new Date('2022-04-23T12:45:00Z'),
        secondHalfStart: new Date('2022-04-23T13:00:00Z'),
      },
    )

    const oddsFormatted = mapper.toPersistence(new Date('2022-04-23T12:41:45Z'))
    const invalidateOdds = new InvalidateOdds(market, goals, oddsFormatted)
    const oddsWithStatus = invalidateOdds.setClosed()

    expect(oddsWithStatus.at(-1)?.marketStatus).toBe('CLOSED')
  })
})
