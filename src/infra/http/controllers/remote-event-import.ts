import { RemoteDataVendor } from '@/domain/import/application/use-cases/data-vendor/remote'
import { StartRemoteEventImportUseCase } from '@/domain/import/application/use-cases/start-remote-event-import'
import { PrismaEventImportsRepository } from '@/infra/repositories/prisma/prisma-event-imports-repository'
import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

const remoteEventImportBodySchema = z.object({
  betfairSSOId: z.string(),
  eventId: z.string(),
})

export class RemoteEventImportController {
  async handle(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = remoteEventImportBodySchema.parse(req.body)
      const remoteBetfairDataVendor = new RemoteDataVendor(body.betfairSSOId)
      const eventImportsRepository = new PrismaEventImportsRepository()
      const startRemoteEventImportUseCase = new StartRemoteEventImportUseCase(
        remoteBetfairDataVendor,
        eventImportsRepository,
      )

      const importEntity = await startRemoteEventImportUseCase.execute({
        specificEventId: body.eventId,
      })

      reply.send({
        import: {
          id: importEntity.id,
        },
      }) // or reply with the stream
    } catch (error) {
      console.log(error)
      reply.status(400).send({ error })
    }
  }
}
