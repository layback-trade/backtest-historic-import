import { app, publisher } from '@/infra/http/server'
import { FullMarketFile } from '@/infra/queue/workerHandlers/market-resources-handler'
import { BZ2Reader } from '@/infra/reader/bz2-reader'
import { EventImport } from '../../enterprise/entities/event-import'
import { Period } from '../../enterprise/entities/value-objects/period'
import { EventImportsRepository } from '../repositories/event-imports-repository'
import { DataVendor } from './data-vendor'

interface StartRemoteEventImportUseCaseProps {
  specificEventId: string
}

export class StartRemoteEventImportUseCase {
  constructor(
    private dataVendor: DataVendor,
    private eventImportsRepository: EventImportsRepository,
  ) {}

  async execute({
    specificEventId,
  }: StartRemoteEventImportUseCaseProps): Promise<EventImport> {
    const fullPeriod = new Period(new Date('2020-01-01'), new Date()) // used if we are only looking for a specific event

    const eventImport = new EventImport({
      eventId: specificEventId,
    })

    publisher.importId = eventImport.id
    publisher.importType = 'event'

    await this.eventImportsRepository.create(eventImport)

    const stream = await this.dataVendor.getDataStream(
      fullPeriod,
      eventImport.eventId,
    )

    return new Promise((resolve, reject) => {
      let dataReceivedCount = 0
      stream.on('entry', async function (header, stream, next) {
        dataReceivedCount++
        const marketDataJSON =
          await BZ2Reader.convertToString<FullMarketFile>(stream)

        await publisher.publishAll(
          marketDataJSON,
          fullPeriod.startDate,
          fullPeriod.endDate,
        )
        next()
      })

      stream.on('finish', async () => {
        resolve(eventImport)
        if (dataReceivedCount === 0) {
          app.log.error("Source didn't return any data")
          await this.eventImportsRepository.delete(eventImport.id)
        } else {
          app.log.info('Source provided data')
        }
      })
      stream.on('error', (err) => {
        app.log.error(err)
        reject(err)
      })
    })
  }
}
