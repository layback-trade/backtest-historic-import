import { ListImportsUseCase } from '@/domain/import/application/use-cases/list-imports'
import { PrismaEventImportsRepository } from '@/infra/repositories/prisma/prisma-event-imports-repository'
import { PrismaImportsRepository } from '@/infra/repositories/prisma/prisma-imports-repository'

import { FastifyReply, FastifyRequest } from 'fastify'

export class ListImportsController {
  async handle(req: FastifyRequest, reply: FastifyReply) {
    try {
      const importsRepository = new PrismaImportsRepository()
      const eventImportsRepository = new PrismaEventImportsRepository()
      const listImportsUseCase = new ListImportsUseCase(
        importsRepository,
        eventImportsRepository,
      )
      const imports = await listImportsUseCase.execute()
      const importsFormatted = imports.map((importEntity) => ({
        id: importEntity.id,
        createdAt: importEntity.createdAt,
        status: importEntity.status,
        endedAt: importEntity.endedAt,
        eventsAdded: importEntity.eventsAdded,
        totalEvents: importEntity.totalEvents,
        totalEventsWithMarket: importEntity.totalEventsWithMarket,
      }))
      reply.send({ imports: importsFormatted })
    } catch (error) {
      reply.status(400).send({ error })
    }
  }
}
