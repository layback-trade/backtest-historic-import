import { Queue as BullQueue, Worker as BullWorker, Processor } from 'bullmq'

import { jobsRedis } from '../cache/redis'

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
    connection: jobsRedis,
  }).on('error', (err) => {
    // captureException(err)
    console.error(err)
  })

  for (let i = 0; i < worker.quantity; i++) {
    new BullWorker(name, worker.handler, {
      connection: jobsRedis,
      lockDuration: 1000 * 100,
    }).on('error', (err) => {
      // captureException(err)
      console.error(err)
    })
    // .on('failed', async (job, err) => {
    //   if (job) {
    //     await onQueueFailure({
    //       err,
    //       queue: name,
    //       failedReason: job.failedReason,
    //       parentId: job.parent?.id,
    //     })
    //   }
    // })
    // .on('completed', async (job) => {
    //   // await onQueueComplete({ job, queue: name })
    // })
  }

  return queue
}
