import { EventImportsRepository } from '../repositories/event-imports-repository'
import { ImportsRepository } from '../repositories/imports-repository'

export class ListImportsUseCase {
  constructor(
    private importsRepository: ImportsRepository,
    private eventImportsRepository: EventImportsRepository,
  ) {}

  async execute() {
    const periodImports = await this.importsRepository.findMany()
    const eventImports = await this.eventImportsRepository.findMany()

    return [...periodImports, ...eventImports].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }
}
