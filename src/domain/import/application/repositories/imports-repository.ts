import { Import } from '../../enterprise/entities/import'

export interface ImportsRepository {
  findById(id: string): Promise<Import | null>
  findMany(): Promise<Import[]>
  save(importEntity: Import): Promise<void>
  create(importEntity: Import): Promise<void>
  delete(id: string): Promise<void>
}
