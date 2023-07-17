import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

// NOTE: This uses the PG* environment variables by default to configure the connection.
const pool = new Pool();

/**
 * This endpoint returns the amount of tokens allocated to a specific identity
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ecosystem, identity } = req.query
  try {
    const result = await pool.query('SELECT amount FROM token_allocations WHERE ecosystem = $1::text AND identity = $2::text', [ecosystem, identity])
    console.log(JSON.stringify(result.rows[0])) // Hello world!

    res.status(200).json({ amount: result.rows[0] })
  } catch (error) {
    res.status(404)
  }
}
