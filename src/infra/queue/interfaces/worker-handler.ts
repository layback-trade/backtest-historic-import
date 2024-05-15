import { Processor } from 'bullmq'

export interface WorkerHandler<Payload> {
  process: Processor<Payload>
}
