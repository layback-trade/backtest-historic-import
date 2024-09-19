import { FastifyReply, FastifyRequest } from 'fastify'
import { app } from '../server'
export class HealthController {
  async handle(req: FastifyRequest, reply: FastifyReply) {
    try {
      reply.send({ message: 'Healthy' }) // or reply with the stream
    } catch (error) {
      app.log.error(error)
      reply.status(400).send({ error })
    }
  }
}
