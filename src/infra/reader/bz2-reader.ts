import { Readable } from 'stream'
import bz2 from 'unbzip2-stream'

export class BZ2Reader {
  static async convertToString<FileContentType>(
    stream: Readable,
  ): Promise<FileContentType[]> {
    let fileContentString = ''
    return new Promise((resolve, reject) => {
      stream
        .pipe(bz2())
        .on('data', (data) => (fileContentString += data))
        .on('end', () => {
          const fileDataArray = fileContentString.split('\n')
          const fileDataJSON: FileContentType[] = fileDataArray
            .map((fileDataArray) =>
              fileDataArray ? JSON.parse(fileDataArray) : fileDataArray,
            )
            .filter((fileDataArray) => typeof fileDataArray === 'object')
          resolve(fileDataJSON)
        })
        .on('error', (err) => {
          console.error(err)
          reject(err)
        })
    })
  }
}
