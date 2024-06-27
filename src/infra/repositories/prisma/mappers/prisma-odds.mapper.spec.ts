import { PrismaOddsMapper, PrismaOddsMapper2 } from './prisma-odds.mapper'

const oddsMock = [
  {
    value: 1.5,
    timestamp: new Date('2022-01-01T00:00:00Z'),
    selection: 'Over',
    marketId: '1',
  },
  {
    value: 2.5,
    timestamp: new Date('2022-01-01T00:01:00Z'),
    selection: 'Under',
    marketId: '1',
  },
  {
    value: 1.75,
    timestamp: new Date('2022-01-01T00:03:00Z'),
    selection: 'Over',
    marketId: '1',
  },
  {
    value: 2.55,
    timestamp: new Date('2022-01-01T00:09:00Z'),
    selection: 'Under',
    marketId: '1',
  },
  {
    value: 1.6,
    timestamp: new Date('2022-01-01T00:10:00Z'),
    selection: 'Over',
    marketId: '1',
  },
  {
    value: 2.58,
    timestamp: new Date('2022-01-01T00:20:00Z'),
    selection: 'Under',
    marketId: '1',
  },
]

describe('Prisma odds mapping tests', () => {
  it('should fill artificial odds correctly', () => {
    const periods = {
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      secondHalfStart: new Date('2022-01-01T01:00:00Z'),
    }
    const oddsMap = new PrismaOddsMapper(oddsMock, periods)
    const odds = oddsMap.toPersistence(new Date('2022-01-01T01:47:00Z'))

    expect(odds.filter((odd) => odd.odd === 1.75).length).toEqual(7)
    expect(
      odds.filter((odd) => odd.createdAt > new Date('2022-01-01T01:45:00Z'))
        .length,
    ).toEqual(4)
  })

  it('should fill artificial odds correctly', () => {
    const periods = {
      firstHalfStart: new Date('2022-01-01T00:00:00Z'),
      firstHalfEnd: new Date('2022-01-01T00:45:00Z'),
      secondHalfStart: new Date('2022-01-01T01:00:00Z'),
    }
    const oddsMap = new PrismaOddsMapper2(oddsMock, periods)
    const odds = oddsMap.toPersistence(new Date('2022-01-01T01:47:00Z'))

    expect(odds.filter((odd) => odd.odd === 1.75).length).toEqual(7)
    expect(
      odds.filter((odd) => odd.createdAt > new Date('2022-01-01T01:45:00Z'))
        .length,
    ).toEqual(4)
  })
})
