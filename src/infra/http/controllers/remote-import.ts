import { RemoteDataVendor } from '@/domain/import/application/use-cases/data-vendor/remote'
import { StartRemoteImportUseCase } from '@/domain/import/application/use-cases/start-remote-import'
import { PrismaImportsRepository } from '@/infra/repositories/prisma/prisma-imports-repository'
import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { app } from '../server'

const remoteImportBodySchema = z.object({
  betfairSSOId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
})

export class RemoteImportController {
  async handle(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = remoteImportBodySchema.parse(req.body)
      const remoteBetfairDataVendor = new RemoteDataVendor(body.betfairSSOId)
      const importsRepository = new PrismaImportsRepository()
      const startRemoteImportUseCase = new StartRemoteImportUseCase(
        remoteBetfairDataVendor,
        importsRepository,
      )

      const importEntity = await startRemoteImportUseCase.execute({
        endDate: body.endDate,
        startDate: body.startDate,
      })

      reply.send({
        import: {
          id: importEntity.id,
        },
      }) // or reply with the stream
    } catch (error) {
      app.log.error(error)
      reply.status(400).send({ error })
    }
  }
}
