import axios from 'axios'
import tar from 'tar-stream'

import { FullMarketFile } from '../queue/workerHandlers/market-resources-handler'
import { BZ2Reader } from '../reader/bz2-reader'
import { publisher } from '../start'

export class RemoteImport {
  private downloadKey: string = ''
  private downloadFilesUrl = `https://historicdata.betfair.com/api/DownloadFiles`
  private preDownloadUrl = `https://historicdata.betfair.com/api/PreDownload`

  constructor(private betfairSSOId: string) {}

  async execute() {
    const { key } = await this.getDownloadKey() // todo specific interval

    if (!key) {
      throw new Error('Key not found.')
    }

    this.downloadKey = key

    await this.fetchData()
  }

  private async getDownloadKey() {
    const markets = [
      // 'MATCH_ODDS',
      // 'CORRECT_SCORE',
      // 'BOTH_TEAMS_TO_SCORE',
      // 'OVER_UNDER_05',
      // 'OVER_UNDER_15',
      // 'OVER_UNDER_25',
      // 'OVER_UNDER_35',
      // 'OVER_UNDER_45',
      // 'OVER_UNDER_55',
      // 'OVER_UNDER_65',
      'HALF_TIME',
      'FIRST_HALF_GOALS_05',
      'FIRST_HALF_GOALS_15',
    ]
    const fromDay = 3
    const fromMonth = 12
    const fromYear = '2023'
    const toDay = 4
    const toMonth = 12
    const toYear = '2023'

    const response = await axios.post(this.preDownloadUrl, [
      {
        countriesCollection: [],
        eventId: '',
        eventName: '',
        fileCount: null,
        fileTypeCollection: [],
        fromDay,
        fromMonth,
        fromYear,
        marketTypesCollection: markets,
        plan: 'Basic Plan',
        sport: 'Soccer',
        toDay,
        toMonth,
        toYear,
        totalSizeMB: null,
      },
    ])

    return { key: response.data }
  }

  private async fetchData() {
    const { data } = await axios({
      method: 'get',
      url: `${this.downloadFilesUrl}?key=${this.downloadKey}`,
      responseType: 'stream',
      headers: {
        Cookie: `ssoid=${this.betfairSSOId}`,
      },
    })

    return new Promise((resolve, reject) => {
      const extract = tar.extract()
      data.on('error', (err) => console.error('Data stream error:', err))

      data.pipe(extract)
      data.on('data', (chunk) => {
        console.log('Received data chunk')
      })

      extract.on('entry', async function (header, stream, next) {
        if (header.type === 'file' && header.name.endsWith('.bz2')) {
          const marketDataJSON =
            await BZ2Reader.convertToString<FullMarketFile>(stream)

          await publisher.publishAll(marketDataJSON)
          next()
        } else {
          console.log('ignoring', header.name)
          stream.resume() // Ignora as entradas que não são arquivos .bz2
          next()
        }
      })

      extract.on('finish', () => {
        resolve('finished')
        console.log('Stream finished')
      })
      extract.on('error', (err) => {
        console.log(err)
        reject(err)
      })
    })
  }
}
