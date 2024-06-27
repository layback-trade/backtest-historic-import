import { LinkedList, OddWithMarketId } from '@/core/linked-list'
import { defaultSelectionsById } from '@/domain/market/enterprise/entities/value-objects/selection'
import { StatisticTypeEnum } from '@/domain/match/enterprise/value-objects/statistic'
import { GameTime, Periods } from '@/infra/queue/helpers/game-time'
import {
  SelectionOdd as PrismaOdd,
  Statistic,
} from '@prisma/client'
import { addMinutes, differenceInSeconds, isBefore } from 'date-fns'
import { InMemoryPersistenceMarket } from '../../in-memory/in-memory-markets-repository'

const gameTimeStatusMap = {
  0: 'PRELIVE',
  1: 'FIRST_HALF',
  1.5: 'INTERVAL',
  2: 'SECOND_HALF',
}

export class PrismaOddsMapper {
  private oddsMap: Map<string, LinkedList> = new Map()

  constructor(
    odds: {
      value: number
      timestamp: Date
      selection: string
      marketId: string
    }[],
    private periods: Periods,
  ) {
    odds.forEach((odd) => {
      const ODD_KEY = `${odd.marketId}-${odd.selection}`
      if (!this.oddsMap.has(ODD_KEY)) {
        this.oddsMap.set(ODD_KEY, new LinkedList())
      }
      this.oddsMap.get(ODD_KEY)!.append(odd)
    })
  }

  public toPersistence(marketClosingTime: Date) {
    const oddsToSave: PrismaOdd[] = []

    for (const [, oddsList] of this.oddsMap) {
      let current = oddsList.head
      while (current) {
        const next = current.next
        
        const oddInPrismaFormat = this.toPrismaFormat(
          current.value,
          next?.value.timestamp ?? null,
        )
        oddsToSave.push(oddInPrismaFormat)
        
        if (next) {
          const artificialOddsCreated = this.fillGaps(current.value, next.value)
          oddsToSave.push(...artificialOddsCreated)
        } else {
          const shouldFillTillClosing =
            differenceInSeconds(marketClosingTime, current.value.timestamp) > 118
          if (shouldFillTillClosing) {
            const lastOdd = {
              ...current.value,
              timestamp: marketClosingTime,
            }

            const lastOddInPrismaFormat = this.toPrismaFormat(
              lastOdd,
              null,
              true,
            )
            oddsToSave.push(lastOddInPrismaFormat)

            const artificialOddsCreated = this.fillGaps(current.value, lastOdd)
            oddsToSave.push(...artificialOddsCreated)
          }
        }

        current = next
      }
    }
    
    const oddsToSaveWithoutDuplicates: PrismaOdd[] = []

    oddsToSave.forEach(odd => {
      const duplicatedIndex = oddsToSaveWithoutDuplicates.findIndex(
        (o) =>
          o.marketId === odd.marketId &&
          o.selectionId === odd.selectionId &&
          o.gameTime === odd.gameTime &&
          o.gameTimeStatus === odd.gameTimeStatus && o.createdAt !== odd.createdAt,
      )

      if(duplicatedIndex > -1) {
        oddsToSaveWithoutDuplicates.splice(duplicatedIndex, 1, odd) 
      } else {
        oddsToSaveWithoutDuplicates.push(odd)
      }
    })

    return oddsToSaveWithoutDuplicates
  }

  private fillGaps(odd: OddWithMarketId, nextOdd: OddWithMarketId) {
    const currentTimestamp = odd.timestamp
    const nextTimestamp = nextOdd.timestamp
    const distanceInSeconds = differenceInSeconds(
      nextTimestamp,
      currentTimestamp,
    )

    const MAX_GAP_IN_SECONDS = 118

    const artificialOdds: PrismaOdd[] = []
    if (distanceInSeconds > MAX_GAP_IN_SECONDS) {
      for (let i = Math.ceil(MAX_GAP_IN_SECONDS / 118); i < Math.ceil(distanceInSeconds / 118); i++) {
        const newOdd = {
          ...odd,
          timestamp: addMinutes(currentTimestamp, i),
        }

        if (isBefore(newOdd.timestamp, this.periods.firstHalfStart)) {
          continue
        }

        const oddInPrismaFormat = this.toPrismaFormat(
          newOdd,
          nextTimestamp,
          true,
        )

        artificialOdds.push(oddInPrismaFormat)
      }
    }

    return artificialOdds
  }

  private toPrismaFormat(
    odd: OddWithMarketId,
    nextTimestamp: Date | null = null,
    isArtificial = false,
  ): PrismaOdd {
    const gameTime = new GameTime(odd.timestamp, this.periods)

    const staledAt = nextTimestamp

    return {
      odd: odd.value,
      createdAt: odd.timestamp,
      selectionId: Number(odd.selection),
      marketId: odd.marketId,
      gameTime: gameTime.minute,
      gameTimePeriod: gameTime.period,
      gameTimeStatus: gameTimeStatusMap[gameTime.period],
      marketStatus: 'OPEN',
      staledAt: staledAt ?? new Date('2099-01-01'),
      isArtificial,
    }
  }
}

export class PrismaOddsMapper2 {
  constructor(
    private odds: OddWithMarketId[],
    private periods: Periods,
  ) {}

  public toPersistence(marketClosingTime: Date): PrismaOdd[] {
    const oddFiller = new OddsGapFiller(this.odds, this.periods)
    const oddsWithGapsFilled = oddFiller.fillAll(marketClosingTime)

    return oddsWithGapsFilled.map((odd) => this.toPrismaFormat(odd))
  }

  private toPrismaFormat(
    odd: OddWithMarketId & {
      staledAt?: Date
      isArtificial: boolean
    },
  ): PrismaOdd {
    const gameTime = new GameTime(odd.timestamp, this.periods)

    return {
      odd: odd.value,
      createdAt: odd.timestamp,
      selectionId: Number(odd.selection),
      marketId: odd.marketId,
      gameTime: gameTime.minute,
      gameTimePeriod: gameTime.period,
      gameTimeStatus: gameTimeStatusMap[gameTime.period],
      staledAt: odd.staledAt ?? new Date('2099-01-01'),
      marketStatus: 'OPEN',
      isArtificial: odd.isArtificial,
    }
  }
}

export class OddsGapFiller {
  private oddsMap: Map<string, LinkedList> = new Map()

  constructor(
    odds: {
      value: number
      timestamp: Date
      selection: string
      marketId: string
    }[],
    private periods: Periods,
  ) {
    odds.forEach((odd) => {
      const ODD_KEY = `${odd.marketId}-${odd.selection}`
      if (!this.oddsMap.has(ODD_KEY)) {
        this.oddsMap.set(ODD_KEY, new LinkedList())
      }
      this.oddsMap.get(ODD_KEY)!.append(odd)
    })
  }

  public fillAll(marketClosingTime: Date) {
    const oddsToSave: (OddWithMarketId & {
      staledAt?: Date
      isArtificial: boolean
    })[] = []

    for (const [, oddsList] of this.oddsMap) {
      let current = oddsList.head
      while (current) {
        const next = current.next
        if (next) {
          const gapFilled = this.fillGaps(current.value, next.value)
          oddsToSave.push(...gapFilled)
        } else {
          const shouldFillTillClosing =
            differenceInSeconds(marketClosingTime, current.value.timestamp) > 118
          if (shouldFillTillClosing) {
            const lastOdd = {
              ...current.value,
              timestamp: marketClosingTime,
              isArtificial: true,
            }

            const gapFilled = this.fillGaps(current.value, lastOdd)
            oddsToSave.push(...gapFilled)
            oddsToSave.push(lastOdd)
          } else {
            oddsToSave.push({
              ...current.value,
              isArtificial: false,
            })
          }
        }

        current = next
      }
    }

    return oddsToSave
  }

  private fillGaps(odd: OddWithMarketId, nextOdd: OddWithMarketId) {
    const currentTimestamp = odd.timestamp
    const nextTimestamp = nextOdd.timestamp
    const distanceInSeconds = differenceInSeconds(
      nextTimestamp,
      currentTimestamp,
    )

    if(currentTimestamp.getTime() === 1715016045530) {
      console.log("here")
    }

    const MAX_GAP_IN_SECONDS = 118

    const odds: (OddWithMarketId & {
      staledAt?: Date
      isArtificial: boolean
    })[] = []
    if (distanceInSeconds > MAX_GAP_IN_SECONDS) {
      for (let i = 1; i < Math.ceil(distanceInSeconds / 118); i++) {
        const newOdd = {
          ...odd,
          timestamp: addMinutes(currentTimestamp, i),
          staledAt: nextTimestamp,
          isArtificial: true,
        }

        if (isBefore(newOdd.timestamp, this.periods.firstHalfStart)) {
          continue
        }

        odds.push(newOdd)
      }
    }

    odds.push({
      ...odd,
      staledAt: nextTimestamp,
      isArtificial: false,
    })

    return odds
  }
}

export class OddsSuspender {
  private goals: Statistic[]
  constructor(
    private market: InMemoryPersistenceMarket,
    goals: Statistic[],
    private prismaOdds: PrismaOdd[],
  ) {
    this.goals = goals.filter(
      (goal) => goal.type === StatisticTypeEnum.GOAL,
    )
  }

  public invalidateAll() {
    const marketSuspendedTimes = this.market.statusHistory
    .filter((status) => status.name === 'SUSPENDED')
    .map((status) => ({
      startedAt: status.timestamp,
      finishedAt: this.market.statusHistory
        .slice(this.market.statusHistory.indexOf(status) + 1)
        .find((status) => status.name !== 'SUSPENDED')!.timestamp,
    }))

    const suspendedTimesWithGoals = this.goals.filter(goal => goal.value > 0)
      .map((goal) => ({
        startedAt: goal.createdAt,
        finishedAt: addMinutes(goal.createdAt, 1),
      }))
      .concat(marketSuspendedTimes)

    const oddsWithStatus: PrismaOdd[] = []

    this.prismaOdds.forEach((odd) => {
      let status = 'OPEN'
       const previousOdd = oddsWithStatus
        .filter(
          (o) =>
            o.selectionId === odd.selectionId &&
            o.createdAt! < odd.createdAt! &&
            o.marketId === odd.marketId,
        ).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())[0]
        
      if (
        suspendedTimesWithGoals.some(
          (suspendedTime) =>
            suspendedTime.startedAt <= odd.createdAt! &&
            odd.createdAt! <= suspendedTime.finishedAt,
        ) || (previousOdd?.marketStatus === "SUSPENDED" && odd?.isArtificial)
      ) {
        status = 'SUSPENDED'
      }
      
      oddsWithStatus.push({
        ...odd,
        marketStatus: status,
      })
    })

    this.prismaOdds = oddsWithStatus

    this.setThousand()
    this.setClosed()

    return this.prismaOdds
  }

  private setThousand() {
    if (this.market.type !== 'CORRECT_SCORE') {
      return
    }

    this.prismaOdds = this.prismaOdds.map((odd) => {
      const selectionName =
        defaultSelectionsById[
          Number(odd.selectionId) as keyof typeof defaultSelectionsById
        ]
      const [maxHomeGoals, maxAwayGoals] = selectionName
        .split(' - ')
        .map((value, index) => {
          if (selectionName === 'Any Other Home Win') {
            return index === 0 ? 4 : 3
          } else if (selectionName === 'Any Other Away Win') {
            return index === 0 ? 3 : 4
          } else if (selectionName === 'Any Other Draw') {
            return 4
          }
          return Number(value)
        })

      const goal = this.goals.find(
        (goal) =>
          odd.createdAt! >= goal.createdAt && odd.createdAt! <= goal.staledAt!,
      )

      if (!goal) {
        return odd
      }

      const homeGoals =
        goal.teamSide === 'home' ? goal.value : goal.oppositeSideValue
      const awayGoals =
        goal.teamSide === 'away' ? goal.value : goal.oppositeSideValue

      if (homeGoals > maxHomeGoals || awayGoals > maxAwayGoals) {
        odd.odd = 1000
      }

      return odd
    })
  }

  private setClosed() {
    this.prismaOdds = this.prismaOdds.map((odd) => {
      const goal = this.goals.find(
        (goal) =>
          odd.createdAt! >= goal.createdAt && odd.createdAt! <= goal.staledAt!,
      )

      if (!goal) {
        return odd
      }

      const totalGoals = goal.value + goal.oppositeSideValue
      switch (this.market.type) {
        case 'FIRST_HALF_GOALS_05':
        case 'OVER_UNDER_05':
          odd.marketStatus = totalGoals > 0 ? 'CLOSED' : odd.marketStatus
          break
        case 'FIRST_HALF_GOALS_15':
        case 'OVER_UNDER_15':
          odd.marketStatus = totalGoals > 1 ? 'CLOSED' : odd.marketStatus
          break
        case 'OVER_UNDER_25':
          odd.marketStatus = totalGoals > 2 ? 'CLOSED' : odd.marketStatus
          break
        case 'OVER_UNDER_35':
          odd.marketStatus = totalGoals > 3 ? 'CLOSED' : odd.marketStatus
          break
        case 'OVER_UNDER_45':
          odd.marketStatus = totalGoals > 4 ? 'CLOSED' : odd.marketStatus
          break
        case 'OVER_UNDER_55':
          odd.marketStatus = totalGoals > 5 ? 'CLOSED' : odd.marketStatus
          break
        case 'OVER_UNDER_65':
          odd.marketStatus = totalGoals > 6 ? 'CLOSED' : odd.marketStatus
          break
        case 'BOTH_TEAMS_TO_SCORE':
          odd.marketStatus =
            goal.value > 0 && goal.oppositeSideValue > 0
              ? 'CLOSED'
              : odd.marketStatus
          break
      }

      return odd
    })
  }
}
