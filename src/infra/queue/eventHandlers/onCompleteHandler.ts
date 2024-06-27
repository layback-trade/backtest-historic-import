import { EndRemoteEventImportUseCase } from '@/domain/import/application/use-cases/end-remote-event-import'
import { EndRemoteImportUseCase } from '@/domain/import/application/use-cases/end-remote-import'

import { CountMatchesUseCase } from '@/domain/match/application/use-cases/count-matches'
import { publisher, queues } from '@/infra/http/server'
import { pool } from '@/infra/repositories/pg/pool'
import { PrismaEventImportsRepository } from '@/infra/repositories/prisma/prisma-event-imports-repository'
import { PrismaEventsRepository } from '@/infra/repositories/prisma/prisma-events-repository'
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

    const publishedNewMatches = publisher.publishMatches(shouldPublishLastMatches)
    if(!publishedNewMatches && shouldPublishLastMatches) {
      return publisher.publishMatchesToSave(true)
    }

    const isTheLastMatchJob = name.includes('OVERPASS') //|| (matchesToFetch.length === 0 && data.eventsIdBatch.length === 10)
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
      const eventsRepository = new PrismaEventsRepository()
      const eventsWithoutMarket = await eventsRepository.countWithoutMarket()

      const eventsAdded = publisher.matchesAdded
      publisher.resetMatchesAdded()

      await endImportUseCase.execute({
        totalEvents: matchesCount,
        totalEventsWithMarket: eventsWithoutMarket,
        eventsAdded,
        importId: publisher.importId,
      })

      console.time("Atualização de histórico dos times")
      await pool.query(`
      BEGIN;
        insert into LastTeamMatches(id, eventIdLast, id_mesmo_mando, id_mesma_competicao, qt_jogo_passado_casa, qt_jogo_passado_fora)
        select events."id", lastEvents."id",
          case when events."homeTeamId" = lastEvents."homeTeamId" or events."awayTeamId" = lastEvents."awayTeamId" then 'S' else 'N' end as id_mesmo_mando,
          case when events."competitionId" = lastEvents."competitionId" then 'S' else 'N' end as id_mesma_competicao,
          0 as qt_jogo_passado_casa,
          0 as qt_jogo_passado_fora
        from events
        inner join events as lastEvents on (lastEvents."startDate" < events."startDate" and (lastEvents."homeTeamId" in (events."homeTeamId", events."awayTeamId") or lastEvents."awayTeamId" in (events."homeTeamId", events."awayTeamId")))
        where events."startDate" between '2024-05-20T00:00:00Z' and '2024-05-28T23:59:59Z'
          and not exists (select 1 from LastTeamMatches as L where L.id = events."id" and L.eventIdLast = lastEvents."id");

        update LastTeamMatches
        set qt_jogo_passado_casa = x.seq
        from Lateral(SELECT LastTeamMatches.id, LastTeamMatches.eventIdLast, lastEvents."startDate", ROW_NUMBER() OVER (PARTITION BY LastTeamMatches.id ORDER BY lastEvents."startDate" desc) as seq
        FROM LastTeamMatches
        inner join events as lastEvents on (LastTeamMatches.eventIdLast = lastEvents."id")
        inner join events on (LastTeamMatches."id" = events."id" and events."homeTeamId" in (lastEvents."homeTeamId", lastEvents."awayTeamId"))) as x -- and events."startDate" between '2024-05-20T00:00:00Z' and '2024-05-28T23:59:59Z'
        where LastTeamMatches.id = x.id and LastTeamMatches.eventIdLast = x.eventIdLast and LastTeamMatches.qt_jogo_passado_casa = 0;

        update LastTeamMatches
        set qt_jogo_passado_fora = x.seq
        from Lateral(SELECT LastTeamMatches.id, LastTeamMatches.eventIdLast, lastEvents."startDate", ROW_NUMBER() OVER (PARTITION BY LastTeamMatches.id ORDER BY lastEvents."startDate" desc) as seq
        FROM LastTeamMatches
        inner join events as lastEvents on (LastTeamMatches.eventIdLast = lastEvents."id")
        inner join events on (LastTeamMatches."id" = events."id" and events."awayTeamId" in (lastEvents."homeTeamId", lastEvents."awayTeamId"))) as x
        where LastTeamMatches.id = x.id and LastTeamMatches.eventIdLast = x.eventIdLast and LastTeamMatches.qt_jogo_passado_fora = 0;
      COMMIT;
      `)
      console.timeEnd("Atualização de histórico dos times")
    }
  }
}
