import { CSVConverter } from '@/infra/csv/converter'

import { SelectionOdd } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { from as copyFrom } from 'pg-copy-streams'
import { pipeline } from 'stream/promises'
import { pool } from './pool'

export class PgCopyOdds {
  static async save(odds: SelectionOdd[]) {
    if(odds.length === 0) {
      return
    }
    const copyId = `copy-${odds[0].marketId}`
    const dataPath = path.join(__dirname, `../../../../tmp/${copyId}.csv`)
    
    await CSVConverter.convertToCSV({
      data: odds.map((odd) => ({
        selectionId: odd.selectionId,
        marketId: odd.marketId,
        gameTime: odd.gameTime,
        gameTimeStatus: odd.gameTimeStatus,
        odd: odd.odd,
        marketStatus: odd.marketStatus,
        isArtificial: odd.isArtificial,
        createdAt: odd.createdAt!.toISOString(),
        staledAt: odd.staledAt.toISOString(),
        gameTimePeriod: odd.gameTimePeriod,
      })),
      path: dataPath,
    })

    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      const ingestStream = client.query(
        copyFrom(
          `COPY selections_odd FROM STDIN WITH (FORMAT CSV, DELIMITER ',')`,
        ),
      )
      const sourceStream = fs.createReadStream(dataPath)
      await pipeline(sourceStream, ingestStream)
    } finally {
      await client.query('COMMIT')
      client.release()
      // remove file

      fs.unlinkSync(dataPath)
    }
  }
}
