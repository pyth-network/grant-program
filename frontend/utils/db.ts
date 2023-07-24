import { Pool } from 'pg'

export function getDatabasePool(): Pool {
  // NOTE: This uses the PG* environment variables by default to configure the connection.
  return new Pool()
}
