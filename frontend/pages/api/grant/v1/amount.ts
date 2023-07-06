import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@clickhouse/client'

const client = createClient({
  host: `${process.env.ALTINITY_CLICKHOUSE_HOST}`,
  username: `${process.env.ALTINITY_CLICKHOUSE_USER}`,
  password: `${process.env.ALTINITY_CLICKHOUSE_PASSWORD}`,
})

/**
 * This endpoint returns the amount of tokens allocated to a specific identity
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ecosystem, identity } = req.query
  try {
    let result = await client.query({
      query: `SELECT amount FROM token_allocations WHERE ecosystem = '${ecosystem}' AND identity = '${identity}'`,
    })
    let json = (await result.json()) as any
    res.status(200).json({ amount: json['data'][0]['amount'] })
  } catch (error) {
    res.status(404)
  }
}
