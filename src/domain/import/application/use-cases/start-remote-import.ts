import { publisher } from '@/infra/http/server'
import { FullMarketFile } from '@/infra/queue/workerHandlers/market-resources-handler'
import { BZ2Reader } from '@/infra/reader/bz2-reader'
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
    const period = new Period(startDate, endDate)

    const importEntity = new Import({
      period,
      // specificEventId: specificEventId ?? undefined,
    })
    publisher.importId = importEntity.id

    await this.importsRepository.create(importEntity)

    const stream = await this.dataVendor.getDataStream(period)
    return new Promise((resolve, reject) => {
      stream.on('entry', async function (header, stream, next) {
        const marketDataJSON =
          await BZ2Reader.convertToString<FullMarketFile>(stream)

        await publisher.publishAll(marketDataJSON)
        next()
      })

      stream.on('finish', () => {
        resolve(importEntity)
        console.log('Stream finished')
      })
      stream.on('error', (err) => {
        console.log(err)
        reject(err)
      })
    })
  }
}
