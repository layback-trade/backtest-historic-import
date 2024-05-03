import { CreateEventUseCase } from '@/domain/market/application/use-cases/create-event'
import { CreateMarketUseCase } from '@/domain/market/application/use-cases/create-market'
import { Publisher } from './publisher'
import { RemoteImport } from './remote-import/entry'
import { InMemoryCompetitionsRepository } from './repositories/in-memory/in-memory-competitions-repository'
import { InMemoryEventsRepository } from './repositories/in-memory/in-memory-events-repository'
import { InMemoryMarketsRepository } from './repositories/in-memory/in-memory-markets-repository'
import { InMemoryMatchesRepository } from './repositories/in-memory/in-memory-matches-repository'
import { InMemoryTeamsRepository } from './repositories/in-memory/in-memory-teams-repository'

const path = '/Users/vini/Downloads/betfair_history/NEW_DOWNLOAD'

const inMemoryEventsRepository = new InMemoryEventsRepository()
const inMemoryMarketsRepository = new InMemoryMarketsRepository()
const inMemoryMatchesRepository = new InMemoryMatchesRepository()
const inMemoryTeamsRepository = new InMemoryTeamsRepository()
const inMemoryCompetitionsRepository = new InMemoryCompetitionsRepository()

const createEventUseCase = new CreateEventUseCase(inMemoryEventsRepository)
const createMarketUseCase = new CreateMarketUseCase(
  inMemoryMarketsRepository,
  inMemoryEventsRepository,
)

export const publisher = new Publisher(
  inMemoryEventsRepository,
  inMemoryMatchesRepository,
  inMemoryTeamsRepository,
  inMemoryCompetitionsRepository,
  inMemoryMarketsRepository,
  createEventUseCase,
  createMarketUseCase,
)

export async function start() {
  const remoteImport = new RemoteImport(
    '1oVjUokR057b9dt37jsHv3ih3HPwau/e8/69VKB/Hpo=',
  )

  await remoteImport.execute()
  // const start = new Date('2023-05-20T12:00:00Z')
  // const end = new Date('2023-05-20T23:59:59Z')
  // const days = eachDayOfInterval({ start, end }).map((day) => ({ day }))

  // for (const fullDay of days.slice(0, 30)) {
  //   const year = format(fullDay.day, 'yyyy')
  //   const month = format(fullDay.day, 'MMM')
  //   const day = format(fullDay.day, 'd')

  //   const isEmptyDay = day === '29' && year === '2020' && month === 'Apr'
  //   if (isEmptyDay) {
  //     continue
  //   }
  //   try {
  //     console.log(`${day}-${month}-${year}`)
  //     const eventsId = await readdir(`${path}/${year}/${month}/${day}`)

  //     // could do the above in parallel
  //     for (const eventId of eventsId) {
  //       const marketsId = await readdir(
  //         `${path}/${year}/${month}/${day}/${eventId}`,
  //       )

  //       console.time('Reading: ' + marketsId.length)
  //       const marketsFileString = await Promise.all(
  //         marketsId.map((market) => {
  //           const marketPath = `${path}/${year}/${month}/${day}/${eventId}/${market}`
  //           const stream = createReadStream(marketPath)
  //           return BZ2Reader.convertToString(stream)
  //         }),
  //       )
  //       console.timeEnd('Reading: ' + marketsId.length)

  //       for (const marketStr of marketsFileString) {
  //         const marketDataJSON: FullMarketFile[] = marketStr
  //           .map((marketData) =>
  //             marketData ? JSON.parse(marketData) : marketData,
  //           )
  //           .filter((marketData) => typeof marketData === 'object')

  //         await publisher.publishAll(marketDataJSON)
  //       }
  //     }
  //   } catch (err) {
  //     console.log(err)
  //   } finally {
  //     publisher.publishMatches()
  //   }
  // }
}
