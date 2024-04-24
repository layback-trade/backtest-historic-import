import IORedis from 'ioredis'
import { env } from '../env'

export const queueRedis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})
