import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

// NOTE: This uses the PG* environment variables by default to configure the connection.
const pool = new Pool()

/**
 * This endpoint returns the breakdown by chain for the evm allocation of a given evm identity.
 */
export default async function handlerEvmBreakdown(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { identity } = req.query
  if (identity === undefined || identity instanceof Array) {
    res.status(400).json({
      error: "Must provide the 'identity' query parameter",
    })
    return
  }

  try {
    const result = await pool.query(
      'SELECT chain, amount FROM evm_breakdowns WHERE identity = $1',
      [identity.toLowerCase()]
    )
    if (result.rows.length == 0) {
      res.status(404).json({
        error: `No result found for identity ${identity}`,
      })
    } else {
      res.status(200).json(result.rows)
    }
  } catch (error) {
    res.status(500).json({
      error: `An unexpected error occurred.`,
    })
  }
}
