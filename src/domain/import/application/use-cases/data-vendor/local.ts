import { Period } from '@/domain/import/enterprise/entities/value-objects/period'
import { env } from '@/infra/env'
import { FullMarketFile } from '@/infra/queue/workerHandlers/market-resources-handler'
import { BZ2Reader } from '@/infra/reader/bz2-reader'
import { format } from 'date-fns'
import { createReadStream } from 'fs'
import { readdir } from 'fs/promises'
import { Readable } from 'stream'
import { DataVendor } from '.'

export class LocalDataVendor implements DataVendor {
  async getData(period: Period): Promise<Readable> {
    const jsonStream = new Readable({
      read() {},
    })

    for (const fullDay of period.allDaysInPeriod) {
      const year = format(fullDay, 'yyyy')
      const month = format(fullDay, 'MMM')
      const day = format(fullDay, 'd')

      const isEmptyDay = day === '29' && year === '2020' && month === 'Apr'
      if (isEmptyDay) {
        continue
      }
      try {
        console.log(`${day}-${month}-${year}`)
        const eventsId = await readdir(
          `${env.BASE_FILES_PATH}/${year}/${month}/${day}`,
        )

        // could do the above in parallel

        for (const eventId of eventsId) {
          const marketsId = await readdir(
            `${env.BASE_FILES_PATH}/${year}/${month}/${day}/${eventId}`,
          )

          console.time('Reading: ' + marketsId.length)
          const marketsFileJSON = await Promise.all(
            marketsId.map((market) => {
              const marketPath = `${env.BASE_FILES_PATH}/${year}/${month}/${day}/${eventId}/${market}`
              const stream = createReadStream(marketPath)
              return BZ2Reader.convertToString<FullMarketFile>(stream)
            }),
          )
          console.timeEnd('Reading: ' + marketsId.length)

          for (const marketData of marketsFileJSON) {
            jsonStream.push(JSON.stringify(marketData))
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    jsonStream.push(null)

    return jsonStream
  }
}
