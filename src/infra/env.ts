import { config } from 'dotenv'
import { z } from 'zod'
config()

const _env = z.object({
  MATCH_RESOURCES_QUEUE: z.string(),
  MARKET_RESOURCES_QUEUE: z.string(),
  DATA_UNIFICATION_QUEUE: z.string(),
  DATA_SAVING_QUEUE: z.string(),
  REDIS_URL: z.string(),
  BETSAPI_TOKEN: z.string(),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(8888),
  BASE_FILES_PATH: z.string(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
})

export const env = _env.parse(process.env)
