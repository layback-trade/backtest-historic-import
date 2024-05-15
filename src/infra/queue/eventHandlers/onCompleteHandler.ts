import { EndRemoteEventImportUseCase } from '@/domain/import/application/use-cases/end-remote-event-import'
import { EndRemoteImportUseCase } from '@/domain/import/application/use-cases/end-remote-import'

import { CountMatchesUseCase } from '@/domain/match/application/use-cases/count-matches'
import { publisher, queues } from '@/infra/http/server'
import { PrismaEventImportsRepository } from '@/infra/repositories/prisma/prisma-event-imports-repository'
import { PrismaImportsRepository } from '@/infra/repositories/prisma/prisma-imports-repository'
import { PrismaMatchesRepository } from '@/infra/repositories/prisma/prisma-matches-repository'
import { Job } from 'bullmq'
import { MarketResourcesPayload } from '../workerHandlers/match-resources-handler'

export class OnCompleteHandler {
  static async onMarketProcessed() {}

  static async onMatchProcessed({
    data,
    name,
  }: Job<MarketResourcesPayload, void, string>) {
    data.eventsIdBatch.forEach((eventId) => {
      publisher.currentEventsToSave.add(eventId)
    })
    const matchesToFetch = await queues.matchQueue.getActive()

    const shouldPublishLastMatches =
      data.eventsIdBatch.length < 10 || matchesToFetch.length === 0

    publisher.publishMatches(shouldPublishLastMatches)

    const isTheLastMatchJob = name.includes('OVERPASS')
    if (isTheLastMatchJob) {
      publisher.publishMatchesToSave(true)
    }
  }

  static async onDataSaved(job: Job<null, { matchesAdded: number }, string>) {
    const matchesToFetch = await queues.matchQueue.getActive()
    const { matchesAdded } = job.returnvalue
    publisher.incrementMatchesAdded(matchesAdded)

    if (matchesToFetch.length === 0) {
      let endImportUseCase: EndRemoteImportUseCase | EndRemoteEventImportUseCase
      if (publisher.importType === 'event') {
        const eventImportsRepository = new PrismaEventImportsRepository()
        endImportUseCase = new EndRemoteEventImportUseCase(
          eventImportsRepository,
        )
      } else {
        const importsRepository = new PrismaImportsRepository()
        endImportUseCase = new EndRemoteImportUseCase(importsRepository)
      }

      const matchesRepository = new PrismaMatchesRepository()

      const countMatchesUseCase = new CountMatchesUseCase(matchesRepository)
      const matchesCount = await countMatchesUseCase.execute()

      const eventsAdded = publisher.matchesAdded
      publisher.resetMatchesAdded()

      await endImportUseCase.execute({
        totalEvents: matchesCount,
        totalEventsWithMarket: 0,
        eventsAdded,
        importId: publisher.importId,
      })
    }
  }
}
