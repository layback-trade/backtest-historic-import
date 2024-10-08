import { ConflictError } from '@/core/errors/conflict-error'
import { CreateEventUseCase } from '@/domain/market/application/use-cases/create-event'
import { CreateMarketUseCase } from '@/domain/market/application/use-cases/create-market'

import { Selection } from '@/domain/market/enterprise/entities/value-objects/selection'
import { isBefore, startOfDay } from 'date-fns'
import {
  inMemoryEventsRepository,
  inMemoryMarketsRepository,
} from './http/make-instances'
import { app, queues } from './http/server'
import { FullMarketFile } from './queue/workerHandlers/market-resources-handler'

export class Publisher {
  private eventsWithMatchAlreadyFetched = new Set<string>()
  private currentEventsToFetchMatch = new Set<string>()
  public currentEventsToSave = new Set<string>()
  private MINIMUM_EVENTS_BATCH_SIZE_TO_FETCHING = 10
  private MINIMUM_EVENTS_BATCH_SIZE_TO_SAVING = 200
  private createEventUseCase = new CreateEventUseCase(inMemoryEventsRepository)
  private createMarketUseCase = new CreateMarketUseCase(
    inMemoryMarketsRepository,
    inMemoryEventsRepository,
  )

  private _matchesAdded = 0

  public importId: string = ''
  public importType: 'event' | 'period' = 'period'

  async publishAll(
    marketData: FullMarketFile[],
    startDate: Date,
    endDate: Date,
  ) {
    const marketId = marketData[0].mc[0].id

    if (!marketData[marketData.length - 1].mc[0].marketDefinition) {
      throw new Error('Invalid market definition')
    }

    const { eventId, eventName, marketType, runners, openDate } =
      marketData[marketData.length - 1].mc[0].marketDefinition!

    if (
      isBefore(new Date(openDate), startOfDay(startDate)) ||
      new Date(openDate).getTime() >= startOfDay(endDate).getTime()
    ) {
      return
    }

    try {
      const eventAlreadyExists =
        await inMemoryEventsRepository.findById(eventId)

      if (!eventAlreadyExists) {
        await this.createEventUseCase.execute({
          id: eventId,
          name: eventName,
          scheduledStartDate: openDate,
        })
      }

      const isMarketInvalid = marketData
        .at(-1)
        ?.mc[0].marketDefinition?.runners.every(
          (runner) => runner.status === 'REMOVED',
        )

      if (!isMarketInvalid) {
        await this.createMarketUseCase.execute({
          eventId,
          marketId,
          type: marketType,
          selections: runners.map(
            (runner) => new Selection(String(runner.id), runner.name),
          ),
          createdAt: new Date(marketData[0].pt),
        })
      } else {
        // WARN -> Market without data
        app.log.error('Market without data')
        return
      }
    } catch (err) {
      if (err instanceof ConflictError) {
        app.log.error(`
        Event ID: ${eventId};
        Market ID: ${marketId};
        ${err.message}
        `)
        // return { market: null }
      }
      return
    }

    // dispatch data unification

    // Manage queues

    queues.marketQueue.add(`MARKET-${eventId}-${marketId}`, marketData, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
    })

    const matchWasFetched = this.eventsWithMatchAlreadyFetched.has(eventId)
    if (!matchWasFetched && !this.currentEventsToFetchMatch.has(eventId)) {
      this.currentEventsToFetchMatch.add(eventId)
    }

    this.publishMatches(this.importType === 'event')
  }

  public publishMatches(shouldOverpassBatchMinimum = false): boolean {
    if (this.currentEventsToFetchMatch.size === 0) return false

    const reachTheBatchMinimum =
      this.currentEventsToFetchMatch.size >=
      this.MINIMUM_EVENTS_BATCH_SIZE_TO_FETCHING

    const shouldPublish = reachTheBatchMinimum || shouldOverpassBatchMinimum
    if (shouldPublish) {
      let jobName = 'MATCH'
      if (shouldOverpassBatchMinimum) {
        jobName = 'MATCH-OVERPASS'
        this.eventsWithMatchAlreadyFetched.clear()
      }

      const eventsToFetchMatchToArray = Array.from(
        this.currentEventsToFetchMatch,
      )
      queues.matchQueue.add(
        `${jobName}-${eventsToFetchMatchToArray.join('-')}`,
        { eventsIdBatch: eventsToFetchMatchToArray },
        {
          removeOnComplete: true,
          removeOnFail: false,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          attempts: 3,
        },
      )

      this.currentEventsToFetchMatch.forEach((eventId) => {
        this.eventsWithMatchAlreadyFetched.add(eventId)
      })

      this.currentEventsToFetchMatch.clear()
      return true
    }
    return false
  }

  public publishMatchesToSave(shouldOverpassBatchMinimum = false) {
    if (this.currentEventsToSave.size === 0) return

    const reachTheBatchMinimum =
      this.currentEventsToSave.size >= this.MINIMUM_EVENTS_BATCH_SIZE_TO_SAVING

    if (reachTheBatchMinimum || shouldOverpassBatchMinimum) {
      queues.dataSavingQueue.add('DATA-SAVING', null, {
        removeOnComplete: true,
        removeOnFail: false,
      })
      this.currentEventsToSave.clear()
    }
  }

  get matchesAdded() {
    return this._matchesAdded
  }

  public incrementMatchesAdded(matchesQuantity: number) {
    this._matchesAdded += matchesQuantity
  }

  public resetMatchesAdded() {
    this._matchesAdded = 0
  }
}
