import cors from '@fastify/cors'
import Fastify from 'fastify'
import { ZodError } from 'zod'
import { env } from '../env'
import './make-instances'

import { trace } from '@opentelemetry/api'
import { Publisher } from '../publisher'
import { QueueManager } from '../queue/queue-manager'
import { HealthController } from './controllers/health'
import { ListImportsController } from './controllers/list-imports'
import { RemoteEventImportController } from './controllers/remote-event-import'
import { RemoteImportController } from './controllers/remote-import'

export const app = Fastify({
  logger: {
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          level: 'info',
          options: {
            colorize: true,
          },
        },
        {
          target: 'pino-opentelemetry-transport',
          options: {
            resourceAttributes: {
              serviceName: 'historic-data-import',
            },
          },
        },
      ],
    },
    formatters: {
      log: (log) => {
        const currentSession = trace.getActiveSpan()
        if (currentSession) {
          const { traceId, spanId, traceFlags } = currentSession.spanContext()

          log.traceId = traceId
          log.spanId = spanId
          log.traceFlags = traceFlags
        }

        return log
      },
    },
  },
})

export const queues = new QueueManager()
export const publisher = new Publisher()

const remoteImportController = new RemoteImportController()
const remoteEventImportController = new RemoteEventImportController()
const listImportsController = new ListImportsController()
const healthController = new HealthController()
app.register(cors, {
  origin: '*',
})

app.post('/import', remoteImportController.handle)
app.post('/event-import', remoteEventImportController.handle)
app.get('/imports', listImportsController.handle)
app.get('/health', healthController.handle)

app.setErrorHandler((error, req, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Validation Error',
      issues: error.format(),
    })
  }
  req.log.error(error)

  return reply.status(500).send({ message: 'Internal app error.' })
})

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`app listening at ${address}`)
})
