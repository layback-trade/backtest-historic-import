import { config } from 'dotenv'
import { z } from 'zod'
config()

const _env = z.object({
  GAME_RESOURCES_QUEUE: z.string(),
  MARKET_RESOURCES_QUEUE: z.string(),
  DATA_UNIFICATION_QUEUE: z.string(),
  DATA_SAVING_QUEUE: z.string(),
  REDIS_URL: z.string(),
})

export const env = _env.parse(process.env)
