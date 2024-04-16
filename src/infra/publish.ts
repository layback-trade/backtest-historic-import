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
import { marketResourcesQueueName, queueInstances } from '.'
import { FullMarketFile } from './queue/workerHandlers/market-resources-handler'

const path = '/Users/vini/Downloads/betfair_history/NEW_DOWNLOAD'

export async function publish() {
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
      // batch eventsId in 10 parts
      // const batchedEventsId = []
      // for (let i = 0; i < eventsId.length; i += 10) {
      //   batchedEventsId.push(eventsId.slice(i, i + 10))
      // }
      // for (const batch of batchedEventsId) {
      //   await queueInstances.get(externalResourcesQueueName)!.add(
      //     `EXTERNAL-${batch.join('-')}`,
      //     {
      //       eventsToFetchId: batch,
      //       sourcePath: `${path}/${year}/${month}/${day}`,
      //     },
      //     { removeOnComplete: true },
      //   )
      // }
      for (const eventId of eventsId) {
        const marketsId = await readdir(
          `${path}/${year}/${month}/${day}/${eventId}`,
        )

        for (const marketId of marketsId) {
          const marketPath = `${path}/${year}/${month}/${day}/${eventId}/${marketId}`
          const fileStr = await Reader.processMarketFile(marketPath)
          const marketDataJSON: FullMarketFile[] = fileStr
            .map((marketData) =>
              marketData ? JSON.parse(marketData) : marketData,
            )
            .filter((marketData) => typeof marketData === 'object')
          await queueInstances
            .get(marketResourcesQueueName)!
            .add(`MARKET-${eventId}-${marketId}`, marketDataJSON, {
              removeOnComplete: true,
              // removeOnFail: true,
            })
        }
      }
    } catch (err) {
      console.log(err)
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
