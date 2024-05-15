import { Import } from '../../enterprise/entities/import'

export interface Notifier {
  notify(importEntity: Import): void
}
