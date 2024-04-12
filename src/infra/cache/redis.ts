import IORedis from 'ioredis'
import { env } from '../env'

export const jobsRedis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})
