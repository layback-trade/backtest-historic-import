import { ImportsRepository } from '../repositories/imports-repository'

interface EndRemoteImportUseCaseProps {
  importId: string
  eventsAdded: number
  totalEvents: number
  totalEventsWithMarket: number
}

export class EndRemoteImportUseCase {
  constructor(
    private importsRepository: ImportsRepository,
    // private notifier: Notifier,
  ) {}

  async execute({
    importId,
    eventsAdded,
    totalEvents,
    totalEventsWithMarket,
  }: EndRemoteImportUseCaseProps): Promise<void> {
    const importFound = await this.importsRepository.findById(importId)

    if (!importFound) {
      throw new Error('Import not found')
    }

    importFound.end({
      eventsAdded,
      totalEvents,
      totalEventsWithMarket,
    })

    await this.importsRepository.save(importFound)

    // await this.notifier.notify(importFound)
  }
}
