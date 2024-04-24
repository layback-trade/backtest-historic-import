import { Queue as BullQueue, Worker as BullWorker, Processor } from 'bullmq'

import { env } from '../env'
import { OnCompleteHandler } from './eventHandlers/onCompleteHandler'
import { queueRedis } from './redis'

interface CreateQueueParams {
  name: string
  worker: {
    quantity: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: Processor<any, any, string>
  }
}

export function createQueue({ name, worker }: CreateQueueParams) {
  const queue = new BullQueue(name, {
    connection: queueRedis,
  }).on('error', (err) => {
    console.error(err)
  })

  for (let i = 0; i < worker.quantity; i++) {
    new BullWorker(name, worker.handler, {
      connection: queueRedis,
      lockDuration: 1000 * 100,
    })
      .on('error', (err) => {
        console.error(err)
      })
      .on('completed', (job) => {
        if (name === env.MATCH_RESOURCES_QUEUE) {
          OnCompleteHandler.onMatchProcessed(job)
        }
      })
  }

  return queue
}
