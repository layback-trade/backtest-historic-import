import { Pool, types } from 'pg'

types.setTypeParser(1114, (str) => new Date(str + 'Z'))

const pg = new Pool({
  connectionString: process.env.DATABASE_URL!.replace(
    'sslmode=require',
    'sslmode=no-verify',
  ),
})

export const pool = pg
