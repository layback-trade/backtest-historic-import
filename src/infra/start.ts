import { AddEventMarketUseCase } from '@/domain/market/application/use-cases/add-event-market'
import { CreateEventUseCase } from '@/domain/market/application/use-cases/create-event'
import { eachDayOfInterval, format } from 'date-fns'
import { createReadStream } from 'fs'
import { readdir } from 'fs/promises'
import bz2 from 'unbzip2-stream'
import { Publisher } from './publisher'
import { FullMarketFile } from './queue/workerHandlers/market-resources-handler'
import { InMemoryCompetitionsRepository } from './repositories/in-memory/in-memory-competitions-repository'
import { InMemoryEventsRepository } from './repositories/in-memory/in-memory-events-repository'
import { InMemoryMatchesRepository } from './repositories/in-memory/in-memory-matches-repository'
import { InMemoryTeamsRepository } from './repositories/in-memory/in-memory-teams-repository'

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

export const publisher = new Publisher(
  inMemoryEventsRepository,
  inMemoryMatchesRepository,
  inMemoryTeamsRepository,
  inMemoryCompetitionsRepository,
  createEventUseCase,
  addEventMarketUseCase,
)

export async function start() {
  const start = new Date('2023-05-20T12:00:00Z')
  const end = new Date('2023-05-20T23:59:59Z')
  const days = eachDayOfInterval({ start, end }).map((day) => ({ day }))

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

      // could do the above in parallel
      for (const eventId of eventsId) {
        const marketsId = await readdir(
          `${path}/${year}/${month}/${day}/${eventId}`,
        )

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

          await publisher.publishAll(marketDataJSON)
        }
      }
    } catch (err) {
      console.log(err)
    } finally {
      publisher.publishMatches()
    }
  }
}

export class Reader {
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
