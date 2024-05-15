import { EventImport } from '../../enterprise/entities/event-import'

export interface EventImportsRepository {
  findById(id: string): Promise<EventImport | null>
  findMany(): Promise<EventImport[]>
  save(eventImport: EventImport): Promise<void>
  create(eventImport: EventImport): Promise<void>
}
