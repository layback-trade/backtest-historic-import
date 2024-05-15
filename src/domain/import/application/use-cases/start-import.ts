import { Readable } from 'stream'
import { LocalImport } from '../../enterprise/entities/local-import'
import { Period } from '../../enterprise/entities/value-objects/period'

interface StartImportProps {
  startDate: Date
  endDate: Date
  // eventId?: string
}

export class StartImportUseCase {
  async execute({ endDate, startDate }: StartImportProps): Promise<Readable> {
    const period = new Period(startDate, endDate)
    const localImport = new LocalImport({ period })

    // Cria uma nova stream de leitura
  }
}
