// import { captureException } from '@sentry/node'
import { Queue } from 'bullmq'
import { env } from './env'
import { createQueue } from './queue/createQueue'
import { dataSavingHandler } from './queue/workerHandlers/data-saving-handler'
import { marketResourcesHandler } from './queue/workerHandlers/market-resources-handler'
import { matchResourcesHandler } from './queue/workerHandlers/match-resources-handler'
import { start } from './start'

// setupSentry()

const queues = [
  {
    name: env.MATCH_RESOURCES_QUEUE,
    worker: {
      handler: matchResourcesHandler,
      quantity: 2,
    },
  },
  {
    name: env.MARKET_RESOURCES_QUEUE,
    worker: {
      handler: marketResourcesHandler,
      quantity: 1,
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
    name: env.DATA_SAVING_QUEUE,
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

export const matchResourcesQueue = queueInstances.get(
  env.MATCH_RESOURCES_QUEUE,
)!
export const marketResourcesQueue = queueInstances.get(
  env.MARKET_RESOURCES_QUEUE,
)!
// export const dataUnificationQueue = queueInstances.get(
//   env.DATA_UNIFICATION_QUEUE,
// )!
export const dataSavingQueue = queueInstances.get(env.DATA_SAVING_QUEUE)!

process.on('uncaughtException', async function (err) {
  // captureException(err)
  console.error('Exceção inesperada: ', err)
})

start()
