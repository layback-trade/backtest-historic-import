import { Period } from '@/domain/import/enterprise/entities/value-objects/period'
import axios from 'axios'
import { Writable } from 'stream'
import tar from 'tar-stream'
import { DataVendor } from '.'

export class RemoteDataVendor implements DataVendor {
  private downloadFilesUrl = `https://historicdata.betfair.com/api/DownloadFiles`
  private preDownloadUrl = `https://historicdata.betfair.com/api/PreDownload`
  private markets = [
    'MATCH_ODDS',
    'CORRECT_SCORE',
    'BOTH_TEAMS_TO_SCORE',
    'OVER_UNDER_05',
    'OVER_UNDER_15',
    'OVER_UNDER_25',
    'OVER_UNDER_35',
    'OVER_UNDER_45',
    'OVER_UNDER_55',
    'OVER_UNDER_65',
    'HALF_TIME',
    'FIRST_HALF_GOALS_05',
    'FIRST_HALF_GOALS_15',
  ]

  constructor(private betfairSSOId: string) {}

  async getDataStream(period: Period, eventId?: string): Promise<Writable> {
    const response = await axios.post(this.preDownloadUrl, [
      {
        countriesCollection: [],
        eventId: eventId ?? '',
        eventName: '',
        fileCount: null,
        fileTypeCollection: [],
        fromDay: period.startDayNumber,
        fromMonth: period.startMonthNumber,
        fromYear: String(period.startYearNumber),
        marketTypesCollection: this.markets,
        plan: 'Basic Plan',
        sport: 'Soccer',
        toDay: period.endDayNumber,
        toMonth: period.endMonthNumber,
        toYear: String(period.endYearNumber),
        totalSizeMB: null,
      },
    ])

    const key = response.data

    if (!key) {
      throw new Error('Key not found.')
    }

    const { data } = await axios({
      method: 'get',
      url: `${this.downloadFilesUrl}?key=${key}`,
      responseType: 'stream',
      headers: {
        Cookie: `ssoid=${this.betfairSSOId}`,
      },
    })

    const extract = tar.extract()

    data.pipe(extract)

    return extract
  }
}
