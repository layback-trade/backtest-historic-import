import { ConflictError } from '@/core/errors/conflict-error'
import { AddEventMarketUseCase } from '@/domain/market/application/use-cases/add-event-market'
import { CreateEventUseCase } from '@/domain/market/application/use-cases/create-event'
import { dataSavingQueue, marketResourcesQueue, matchResourcesQueue } from '.'
import { DiscordAlert } from './logging/discord'
import { FullMarketFile } from './queue/workerHandlers/market-resources-handler'
import { InMemoryCompetitionsRepository } from './repositories/in-memory/in-memory-competitions-repository'
import { InMemoryEventsRepository } from './repositories/in-memory/in-memory-events-repository'
import { InMemoryMatchesRepository } from './repositories/in-memory/in-memory-matches-repository'
import { InMemoryTeamsRepository } from './repositories/in-memory/in-memory-teams-repository'

export class Publisher {
  private eventsWithMatchAlreadyFetched = new Set<string>()
  private currentEventsToFetchMatch = new Set<string>()
  public currentEventsToSave = new Set<string>()
  private MINIMUM_EVENTS_BATCH_SIZE_TO_FETCHING = 10
  private MINIMUM_EVENTS_BATCH_SIZE_TO_SAVING = 20

  constructor(
    public inMemoryEventsRepository: InMemoryEventsRepository,
    public inMemoryMatchesRepository: InMemoryMatchesRepository,
    public inMemoryTeamsRepository: InMemoryTeamsRepository,
    public inMemoryCompetitionsRepository: InMemoryCompetitionsRepository,
    private createEventUseCase: CreateEventUseCase,
    private addEventMarketUseCase: AddEventMarketUseCase,
  ) {}

  async publishAll(marketData: FullMarketFile[]) {
    const marketId = marketData[0].mc[0].id

    if (!marketData[0].mc[0].marketDefinition) {
      throw new Error('Invalid market definition')
    }

    // Register event and market
    const { eventId, eventName, marketType, runners, openDate } =
      marketData[0].mc[0].marketDefinition
    try {
      const eventAlreadyExists =
        await this.inMemoryEventsRepository.findById(eventId)

      if (!eventAlreadyExists) {
        await this.createEventUseCase.execute({
          id: eventId,
          name: eventName,
          scheduledStartDate: openDate,
        })
      }

      await this.addEventMarketUseCase.execute({
        eventId,
        marketId,
        type: marketType,
        selections: runners.map((runner) => runner.name),
        createdAt: new Date(marketData[0].pt),
      })
    } catch (err) {
      if (err instanceof ConflictError) {
        DiscordAlert.error(`
        ID do evento: ${eventId};
        ID do mercado: ${marketId};
        ${err.message}
        `)
        // return { market: null }
      }
    }

    // dispatch data unification

    // Manage queues

    marketResourcesQueue.add(`MARKET-${eventId}-${marketId}`, marketData, {
      removeOnComplete: true,
      // removeOnFail: true,
    })

    const matchWasFetched = this.eventsWithMatchAlreadyFetched.has(eventId)
    if (!matchWasFetched && !this.currentEventsToFetchMatch.has(eventId)) {
      this.currentEventsToFetchMatch.add(eventId)
    }

    this.publishMatches()
  }

  public publishMatches(shouldOverpassBatchMinimum = false) {
    if (this.currentEventsToFetchMatch.size === 0) return

    const reachTheBatchMinimum =
      this.currentEventsToFetchMatch.size >=
      this.MINIMUM_EVENTS_BATCH_SIZE_TO_FETCHING

    if (reachTheBatchMinimum || shouldOverpassBatchMinimum) {
      const eventsToFetchMatchToArray = Array.from(
        this.currentEventsToFetchMatch,
      )
      matchResourcesQueue.add(
        `MATCH-${eventsToFetchMatchToArray.join('-')}`,
        { eventsIdBatch: eventsToFetchMatchToArray },
        {
          removeOnComplete: true,
          // removeOnFail: true,
        },
      )

      this.currentEventsToFetchMatch.forEach((eventId) => {
        this.eventsWithMatchAlreadyFetched.add(eventId)
      })

      this.currentEventsToFetchMatch.clear()
    }
  }

  public publishEventsToSave(shouldOverpassBatchMinimum = false) {
    if (this.currentEventsToSave.size === 0) return

    const reachTheBatchMinimum =
      this.currentEventsToSave.size >= this.MINIMUM_EVENTS_BATCH_SIZE_TO_SAVING

    if (reachTheBatchMinimum || shouldOverpassBatchMinimum) {
      dataSavingQueue.add('DATA-SAVING', null, {
        removeOnComplete: false,
        removeOnFail: false,
      })
      this.currentEventsToSave.clear()
    }

    const eventsToSaveToArray = Array.from(this.currentEventsToSave)
    marketResourcesQueue.add(
      `SAVE-${eventsToSaveToArray.join('-')}`,
      { eventsIdBatch: eventsToSaveToArray },
      {
        removeOnComplete: true,
        // removeOnFail: true,
      },
    )
  }
}
