import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config() // Load environment variables from .env file

/** Get the database pool with the default configuration. */
export function getDatabasePool(): Pool {
  // NOTE: This uses the PG* environment variables by default to configure the connection.
  return new Pool()
}
