import { Period } from '@/domain/import/enterprise/entities/value-objects/period'
import { Writable } from 'stream'

export interface DataVendor {
  getDataStream(period: Period, eventId?: string): Promise<Writable>
}
