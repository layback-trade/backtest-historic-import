import { app, publisher } from '@/infra/http/server'
import { FullMarketFile } from '@/infra/queue/workerHandlers/market-resources-handler'
import { BZ2Reader } from '@/infra/reader/bz2-reader'
import { addDays } from 'date-fns'
import { Import } from '../../enterprise/entities/import'
import { Period } from '../../enterprise/entities/value-objects/period'
import { ImportsRepository } from '../repositories/imports-repository'
import { DataVendor } from './data-vendor'

interface StartRemoteImportUseCaseProps {
  startDate: Date
  endDate: Date
}

export class StartRemoteImportUseCase {
  constructor(
    private dataVendor: DataVendor,
    private importsRepository: ImportsRepository,
  ) {}

  async execute({
    endDate,
    startDate,
  }: StartRemoteImportUseCaseProps): Promise<Import> {
    endDate = addDays(endDate, 1)
    const period = new Period(startDate, endDate)

    const importEntity = new Import({
      period,
    })
    publisher.importId = importEntity.id

    await this.importsRepository.create(importEntity)

    const stream = await this.dataVendor.getDataStream(period)
    return new Promise((resolve, reject) => {
      let dataReceivedCount = 0
      stream.on('entry', async function (header, stream, next) {
        dataReceivedCount++
        const marketDataJSON =
          await BZ2Reader.convertToString<FullMarketFile>(stream)

        await publisher.publishAll(marketDataJSON, startDate, endDate)
        next()
      })

      stream.on('finish', async () => {
        resolve(importEntity)
        if (dataReceivedCount === 0) {
          app.log.error("Source didn't return any data")
          await this.importsRepository.delete(importEntity.id)
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
