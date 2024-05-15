import { EventImportsRepository } from '../repositories/event-imports-repository'

interface EndRemoteEventImportUseCaseProps {
  importId: string
  eventsAdded: number
  totalEvents: number
  totalEventsWithMarket: number
}

export class EndRemoteEventImportUseCase {
  constructor(
    private eventImportsRepository: EventImportsRepository,
    // private notifier: Notifier,
  ) {}

  async execute({
    importId,
    eventsAdded,
    totalEvents,
    totalEventsWithMarket,
  }: EndRemoteEventImportUseCaseProps): Promise<void> {
    const importFound = await this.eventImportsRepository.findById(importId)

    if (!importFound) {
      throw new Error('Import not found')
    }

    importFound.end({
      eventsAdded,
      totalEvents,
      totalEventsWithMarket,
    })

    await this.eventImportsRepository.save(importFound)

    // await this.notifier.notify(importFound)
  }
}
