import { format } from 'fast-csv'
import fs from 'fs'

interface ConvertToCSVParams {
  data: Array<unknown>
  path: string
}

export class CSVConverter {
  static async convertToCSV({ data, path }: ConvertToCSVParams) {
    return new Promise((resolve, reject) => {
      const csvStream = format({ headers: false })
      const writableStream = fs.createWriteStream(path)

      writableStream.on('finish', () => {
        resolve('Success')
      })

      writableStream.on('error', (err) => {
        console.error('Error writing CSV file:', err)
        reject(err)
      })

      csvStream.pipe(writableStream).on('end', () => process.exit())
      data.forEach((item) => csvStream.write(item))
      csvStream.end()
    })
  }
}
