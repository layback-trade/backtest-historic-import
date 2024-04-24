// import { captureException } from '@sentry/node'
import { Queue } from 'bullmq'
import { env } from './env'
import { publish } from './publish'
import { createQueue } from './queue/createQueue'
import { dataSavingHandler } from './queue/workerHandlers/data-saving-handler'
import { marketResourcesHandler } from './queue/workerHandlers/market-resources-handler'
import { matchResourcesHandler } from './queue/workerHandlers/match-resources-handler'
// import { dataProcessingHandler } from './queue/workerHandlers/dataProcessingHandler'
// import { dataSavingHandler } from './queue/workerHandlers/dataSavingHandler'
// import { externalResourcesHandler } from './queue/workerHandlers/externalResourcesHandler'

// const startPrisma = async () => {
//   await prisma.$connect()
// }
// startPrisma()
// setupSentry()

export const matchResourcesQueueName = env.MATCH_RESOURCES_QUEUE
export const marketResourcesQueueName = env.MARKET_RESOURCES_QUEUE
export const dataUnificationQueueName = env.DATA_UNIFICATION_QUEUE
export const dataSavingQueueName = env.DATA_SAVING_QUEUE

const queues = [
  {
    name: matchResourcesQueueName,
    worker: {
      handler: matchResourcesHandler,
      quantity: 2,
    },
  },
  {
    name: marketResourcesQueueName,
    worker: {
      handler: marketResourcesHandler,
      quantity: 30,
    },
  },
  // {
  //   name: dataUnificationQueueName,
  //   worker: {
  //     handler: () => {},
  //     quantity: 1,
  //   },
  // },
  {
    name: dataSavingQueueName,
    worker: {
      handler: dataSavingHandler,
      quantity: 1,
    },
  },
]

export const queueInstances = new Map<string, Queue<unknown, unknown, string>>()

function declareQueues() {
  queues.forEach((queue) => {
    const queueInstance = createQueue(queue)
    queueInstances.set(queue.name, queueInstance)
  })
}

declareQueues()

process.on('uncaughtException', async function (err) {
  // captureException(err)
  console.error('Exceção inesperada: ', err)
})

publish()
