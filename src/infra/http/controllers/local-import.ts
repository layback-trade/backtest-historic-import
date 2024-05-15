import { StartImportUseCase } from '@/domain/import/application/use-cases/start-import'
import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

const localImportBodySchema = z.object({
  token: z.string(),
  eventId: z.number().min(6).max(6).nullish(),
  startDate: z.date().default(new Date('2023-01-01')),
  endDate: z.date().default(new Date('2023-01-05')),
})

export class LocalImportController {
  async handle(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = localImportBodySchema.parse(req.body)
      const localImportUseCase = new StartImportUseCase()
      await localImportUseCase.execute({
        ...body,
        // eventId: body.eventId ?? null,
      })

      reply.send() // or reply with the stream
    } catch (error) {
      reply.status(400).send({ error })
    }
  }
}
