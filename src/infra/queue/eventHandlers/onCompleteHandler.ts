import { publisher } from '@/infra/start'
import { Job } from 'bullmq'
import { MarketResourceJobData } from '../workerHandlers/match-resources-handler'

export class OnCompleteHandler {
  static onMarketProcessed() {}

  static onMatchProcessed({ data }: Job<MarketResourceJobData, void, string>) {
    data.eventsIdBatch.forEach((eventId) => {
      publisher.currentEventsToSave.add(eventId)
    })

    const isTheLastMatchJob = data.eventsIdBatch.length < 10

    publisher.publishMatchesToSave(isTheLastMatchJob)
  }
}
