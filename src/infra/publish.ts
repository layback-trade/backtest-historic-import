import { AddEventMarketUseCase } from '@/domain/market/application/use-cases/add-event-market'
import { CreateEventUseCase } from '@/domain/market/application/use-cases/create-event'
import {
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  isFuture,
} from 'date-fns'
import { createReadStream } from 'fs'
import { readdir } from 'fs/promises'
import bz2 from 'unbzip2-stream'
import {
  marketResourcesQueueName,
  matchResourcesQueueName,
  queueInstances,
} from '.'
import { InMemoryCompetitionsRepository } from './cache/repositories/in-memory-competitions-repository'
import { InMemoryEventsRepository } from './cache/repositories/in-memory-events-repository'
import { InMemoryMatchesRepository } from './cache/repositories/in-memory-matches-repository'
import { InMemoryTeamsRepository } from './cache/repositories/in-memory-teams-repository'
import { FullMarketFile } from './queue/workerHandlers/market-resources-handler'

const path = '/Users/vini/Downloads/betfair_history/NEW_DOWNLOAD'

export const inMemoryEventsRepository = new InMemoryEventsRepository()
export const inMemoryMatchesRepository = new InMemoryMatchesRepository()
export const inMemoryTeamsRepository = new InMemoryTeamsRepository()
export const inMemoryCompetitionsRepository =
  new InMemoryCompetitionsRepository()

export const createEventUseCase = new CreateEventUseCase(
  inMemoryEventsRepository,
)
export const addEventMarketUseCase = new AddEventMarketUseCase(
  inMemoryEventsRepository,
)

export const eventsToSave = new Set<string>()
export async function publish() {
  const start = new Date('2023-05-20T12:00:00Z')
  const end = new Date('2023-05-20T23:59:59Z')
  const days = eachDayOfInterval({ start, end }).map((day) => ({ day }))
  const eventsWithMatchFetched = new Set<string>()
  const eventsToFetchMatch = new Set<string>()

  for (const fullDay of days.slice(0, 30)) {
    const year = format(fullDay.day, 'yyyy')
    const month = format(fullDay.day, 'MMM')
    const day = format(fullDay.day, 'd')

    const isEmptyDay = day === '29' && year === '2020' && month === 'Apr'
    if (isEmptyDay) {
      continue
    }
    try {
      console.log(`${day}-${month}-${year}`)
      const eventsId = await readdir(`${path}/${year}/${month}/${day}`)

      // do the above in parallel
      for (const eventId of eventsId.slice(0, 100)) {
        const marketsId = await readdir(
          `${path}/${year}/${month}/${day}/${eventId}`,
        )
        // read market files, loop through all the results, register in inMemoryEventsRepository, then add to queue
        console.time('Reading: ' + marketsId.length)

        const marketsFileString = await Promise.all(
          marketsId.map((market) => {
            const marketPath = `${path}/${year}/${month}/${day}/${eventId}/${market}`
            return Reader.processMarketFile(marketPath)
          }),
        )
        console.timeEnd('Reading: ' + marketsId.length)

        for (const marketStr of marketsFileString) {
          const marketDataJSON: FullMarketFile[] = marketStr
            .map((marketData) =>
              marketData ? JSON.parse(marketData) : marketData,
            )
            .filter((marketData) => typeof marketData === 'object')

          const marketId = marketDataJSON[0].mc[0].id

          if (!marketDataJSON[0].mc[0].marketDefinition) {
            throw new Error('Invalid market definition')
          }
          const {
            eventId: event,
            eventName,
            marketType,
            runners,
            openDate,
          } = marketDataJSON[0].mc[0].marketDefinition
          const eventAlreadyExists =
            await inMemoryEventsRepository.findById(event)
          if (!eventAlreadyExists) {
            await createEventUseCase.execute({
              id: event,
              name: eventName,
              scheduledStartDate: openDate,
            })
            // dispatch data unification
          }

          await addEventMarketUseCase.execute({
            eventId,
            marketId,
            type: marketType,
            selections: runners.map((runner) => runner.name),
            createdAt: new Date(marketDataJSON[0].pt),
          })

          queueInstances
            .get(marketResourcesQueueName)!
            .add(`MARKET-${eventId}-${marketId}`, marketDataJSON, {
              removeOnComplete: true,
              // removeOnFail: true,
            })

          if (
            !eventsWithMatchFetched.has(eventId) &&
            !eventsToFetchMatch.has(eventId)
          ) {
            eventsToFetchMatch.add(eventId)
          }
          if (eventsToFetchMatch.size >= 10) {
            const eventsToFetchMatchArr = Array.from(eventsToFetchMatch)
            queueInstances.get(matchResourcesQueueName)!.add(
              `MATCH-${eventsToFetchMatchArr.join('-')}`,
              { eventsIdBatch: eventsToFetchMatchArr },
              {
                removeOnComplete: false,
                // removeOnFail: true,
              },
            )

            eventsToFetchMatch.forEach((eventId) => {
              eventsWithMatchFetched.add(eventId)
            })
            eventsToFetchMatch.clear()
          }
        }
      }
    } catch (err) {
      console.log(err)
    } finally {
      if (eventsToFetchMatch.size > 0) {
        const eventsToFetchMatchArr = Array.from(eventsToFetchMatch)
        queueInstances.get(matchResourcesQueueName)!.add(
          `MATCH-${eventsToFetchMatchArr.join('-')}`,
          { eventsIdBatch: eventsToFetchMatchArr },
          {
            removeOnComplete: false,
            // removeOnFail: true,
          },
        )

        eventsToFetchMatch.forEach((eventId) => {
          eventsWithMatchFetched.add(eventId)
        })
        eventsToFetchMatch.clear()
      }
    }
  }
}

export class Reader {
  private days: { day: Date }[]

  constructor(from: Date, to: Date) {
    if (isAfter(from, to)) {
      throw new Error('Invalid date range')
    }
    if (isFuture(to)) {
      throw new Error('Invalid date range')
    }
    if (isBefore(from, new Date('2020-01-01'))) {
      throw new Error('Invalid date range')
    }
    this.days = eachDayOfInterval({ start: from, end: to }).map((day) => ({
      day,
    }))
  }

  // public async getMarkets() {
  //   for (const fullDay of this.days) {
  //     const year = format(fullDay.day, 'yyyy')
  //     const month = format(fullDay.day, 'MMM')
  //     const day = format(fullDay.day, 'd')

  //     const isEmptyDay =
  //       day === '29' && year === '2020' && month === 'Apr'
  //     if (isEmptyDay) {
  //       continue
  //     }
  //     try {
  //       console.log(`${day}-${month}-${year}`)
  //       // Obs: could read all eventsId and markets in parallel
  //       const eventsId = await readdir(`${path}/${year}/${month}/${day}`)
  //       for (const eventId of eventsId) {
  //         const marketsId = await readdir(
  //           `${path}/${year}/${month}/${day}/${eventId}`,
  //         )

  //         for (const marketId of marketsId) {
  //           const marketPath = `${path}/${year}/${month}/${day}/${eventId}/${marketId}`
  //           const fileStr = await Markets.processMarketFile(marketPath)
  //           const marketDataJSON: FullMarketFile[] = fileStr
  //             .map((marketData) =>
  //               marketData ? JSON.parse(marketData) : marketData,
  //             )
  //             .filter((marketData) => typeof marketData === 'object')
  //           await queueInstances
  //             .get(marketResourcesQueueName)!
  //             .add(`MARKET-${eventId}-${marketId}`, marketDataJSON, {
  //               removeOnComplete: true,
  //               // removeOnFail: true,
  //             })
  //         }
  //       }
  //     } catch (err) {
  //       console.log(err)
  //     }
  //   }
  // }

  static async processMarketFile(path: string): Promise<string[]> {
    let marketDataString = ''
    const stream = createReadStream(path)
    const marketFile = new Promise<string[]>((resolve) => {
      stream
        .pipe(bz2())
        .on('data', (data) => {
          marketDataString += data
        })
        .on('end', () => {
          resolve(marketDataString.split('\n'))
        })
      // .on('error', (err) => {
      //   discordAlert({
      //     content: `Ocorreu um erro ao tentar ler o arquivo ${path} do evento. Details: ${formatObjectMessage(
      //       err,
      //     )}`,
      //     type: 'error',
      //     operation: 'readMarket',
      //   })
      //   reject(err)
      // })
    })

    return marketFile
  }
}
