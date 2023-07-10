import type { NextApiRequest, NextApiResponse } from 'next'
import { client } from './db';

/**
 * This endpoint returns the amount of tokens allocated to a specific identity
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("HELLO");

  console.log("CONNECTED");
    let result = await client.query(
      `SELECT amount FROM amounts limit 1`,
    )
    console.log(result)
    
    res.status(200).json("Hello world")

}
