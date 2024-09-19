import { Queue as BullQueue, Worker as BullWorker, Processor } from 'bullmq'

import { env } from '../env'

import { app } from '../http/server'
import { BetsAPIMatchVendor } from '../match-vendor/betsapi-match-vendor'
import { OnCompleteHandler } from './eventHandlers/onCompleteHandler'
import { queueRedis } from './redis'
import { DataSavingHandler } from './workerHandlers/data-saving-handler'
import { MarketResourcesHandler } from './workerHandlers/market-resources-handler'
import { MatchResourcesHandler } from './workerHandlers/match-resources-handler'

interface QueueDefinition {
  name: string
  worker: {
    quantity: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: Processor<any, any, string>
  }
}

const betsAPIMatchVendor = new BetsAPIMatchVendor()

const marketResourcesHandler = new MarketResourcesHandler()
const matchResourcesHandler = new MatchResourcesHandler(betsAPIMatchVendor)
const dataSavingHandler = new DataSavingHandler()

const queuesDefinition: QueueDefinition[] = [
  {
    name: env.MATCH_RESOURCES_QUEUE,
    worker: {
      handler: matchResourcesHandler.process,
      quantity: 2,
    },
  },
  {
    name: env.MARKET_RESOURCES_QUEUE,
    worker: {
      handler: marketResourcesHandler.process,
      quantity: 100,
    },
  },
  {
    name: env.DATA_SAVING_QUEUE,
    worker: {
      handler: dataSavingHandler.process,
      quantity: 1,
    },
  },
]

export class QueueManager {
  private _queues: Map<string, BullQueue<unknown, unknown, string>> = new Map()

  constructor() {
    queuesDefinition.forEach(({ name, worker }) => {
      const queue = new BullQueue(name, {
        connection: queueRedis,
      }).on('error', (err) => {
        app.log.error(err)
      })

      for (
        let workersCount = 0;
        workersCount < worker.quantity;
        workersCount++
      ) {
        new BullWorker(name, worker.handler, {
          connection: queueRedis,
          lockDuration: 1000 * 1200, // 20 minutes
        })
          .on('error', (err) => {
            app.log.error(err)
          })
          .on('completed', (job) => {
            if (name === env.MATCH_RESOURCES_QUEUE) {
              OnCompleteHandler.onMatchProcessed(job)
            } else if (name === env.DATA_SAVING_QUEUE) {
              OnCompleteHandler.onDataSaved(job)
            }
          })
      }

      this._queues.set(name, queue)
    })
  }

  get marketQueue() {
    if (!this._queues.get(env.MARKET_RESOURCES_QUEUE)) {
      throw new Error('Market queue not found')
    }
    return this._queues.get(env.MARKET_RESOURCES_QUEUE)!
  }

  get matchQueue() {
    if (!this._queues.get(env.MATCH_RESOURCES_QUEUE)) {
      throw new Error('Match queue not found')
    }
    return this._queues.get(env.MATCH_RESOURCES_QUEUE)!
  }

  get dataSavingQueue() {
    if (!this._queues.get(env.DATA_SAVING_QUEUE)) {
      throw new Error('Data saving queue not found')
    }
    return this._queues.get(env.DATA_SAVING_QUEUE)!
  }
}
