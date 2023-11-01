import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

// NOTE: This uses the PG* environment variables by default to configure the connection.
const pool = new Pool()

/**
 * This endpoint returns the amount of tokens allocated to a specific identity
 */
export default async function handlerAmountAndProof(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ecosystem, identity } = req.query
  if (
    ecosystem === undefined ||
    identity === undefined ||
    identity instanceof Array ||
    ecosystem instanceof Array
  ) {
    res.status(400).json({
      error: "Must provide the 'ecosystem' and 'identity' query parameters",
    })
    return
  }

  try {
    const result = await pool.query(
      'SELECT amount, proof_of_inclusion FROM claims WHERE ecosystem = $1 AND identity = $2',
      [ecosystem, lowerCapIfEvm(identity, ecosystem)]
    )
    if (result.rows.length == 0) {
      res.status(404).json({
        error: `No result found for ${ecosystem} identity ${identity}`,
      })
    } else {
      res.status(200).json({
        amount: result.rows[0].amount,
        proof: (result.rows[0].proof_of_inclusion as Buffer).toString('hex'),
      })
    }
  } catch (error) {
    res.status(500).json({
      error: `An unexpected error occurred`,
    })
  }
}

function lowerCapIfEvm(identity: string, ecosystem: string): string {
  if (ecosystem === 'evm') {
    return identity.toLowerCase()
  }
  return identity
}
