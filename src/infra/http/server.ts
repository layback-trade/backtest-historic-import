import cors from '@fastify/cors'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { env } from '../env'
import './make-instances'

import { Publisher } from '../publisher'
import { QueueManager } from '../queue/queue-manager'
import { ListImportsController } from './controllers/list-imports'
import { RemoteEventImportController } from './controllers/remote-event-import'
import { RemoteImportController } from './controllers/remote-import'

const server = Fastify({})

export const queues = new QueueManager()
export const publisher = new Publisher()

const remoteImportController = new RemoteImportController()
const remoteEventImportController = new RemoteEventImportController()
const listImportsController = new ListImportsController()
server.register(cors, {
  origin: '*',
})

server.post('/import', remoteImportController.handle)
server.post('/event-import', remoteEventImportController.handle)
server.get('/imports', listImportsController.handle)

server.setErrorHandler((error, _, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation Error',
      issues: error.format(),
    })
  }
  console.error(error)

  return reply.status(500).send({ message: 'Internal server error.' })
})

process.on('uncaughtException', async function (err) {
  // captureException(err)
  console.error('Exceção inesperada: ', err)
})

server.listen({ port: env.PORT }, (err, address) => {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
  server.log.info(`Server listening at ${address}`)
})
