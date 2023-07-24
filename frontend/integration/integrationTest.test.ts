import * as anchor from '@coral-xyz/anchor'
import { expect } from '@jest/globals'
import { getDatabasePool } from '../utils/db'
import { ClaimInfo } from '../claim_sdk/claim'
import { MerkleTree } from '../claim_sdk/merkleTree'

const pool = getDatabasePool()

beforeAll(async () => {
  // TODO: run database migrations here. This seems difficult with node-pg-migrate though.

  const sampleData: any[] = [
    ['solana', '3kzAHeiucNConBwKQVHyLcG3soaMzSZkvs4y14fmMgKL', 1000],
    ['evm', '0xf3f9225A2166861e745742509CED164183a626d7', 2000],
    // ['aptos', '0x7e7544df4fc42107d4a60834685dfd9c1e6ff048f49fe477bc19c1551299d5cb', 3000],
    // ['cosmwasm', 'cosmos1lv3rrn5trdea7vs43z5m4y34d5r3zxp484wcpu', 4000]
  ]

  const leaves = sampleData.map((value) => {
    const claimInfo = new ClaimInfo(value[0], value[1], new anchor.BN(value[2]))
    return claimInfo.toBuffer()
  })

  const merkleTree = new MerkleTree(leaves)

  for (let i = 0; i < sampleData.length; i++) {
    const proof = merkleTree.prove(leaves[i])!
    const datum = sampleData[i]

    await pool.query(
      'INSERT INTO claims VALUES($1::ecosystem_type, $2, $3, $4)',
      [datum[0], datum[1], datum[2], proof]
    )
  }
})

afterAll(async () => {
  await pool.query('DELETE FROM claims', [])
  await pool.end()
})

/** Build a Merkle tree and check the result against the Rust implementation. */
test('Find claims', async () => {
  const result = await pool.query(
    'SELECT amount FROM claims WHERE ecosystem = $1 AND identity = $2',
    ['evm', '0xf3f9225A2166861e745742509CED164183a626d7']
  )

  expect(result.rows[0].amount).toBe('2000')
})
