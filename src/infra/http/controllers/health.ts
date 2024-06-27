import { FastifyReply, FastifyRequest } from 'fastify'
export class HealthController {
  async handle(req: FastifyRequest, reply: FastifyReply) {
    try {
      reply.send({ message: 'Healthy' }) // or reply with the stream
    } catch (error) {
      console.log(error)
      reply.status(400).send({ error })
    }
  }
}
