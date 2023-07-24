import * as anchor from '@coral-xyz/anchor'
import { expect } from '@jest/globals'
import { getDatabasePool } from '../utils/db'
import { ClaimInfo } from '../claim_sdk/claim'
import { MerkleTree } from '../claim_sdk/merkleTree'

beforeAll(() => {
  const pool = getDatabasePool()

  const sampleData: any[] = [
    ['evm', '0x1234', 1234],
    ['solana', 'Abe22233', 4556],
  ]

  const leaves = sampleData.map((value) => {
    const claimInfo = new ClaimInfo(value[0], value[1], new anchor.BN(value[2]))
    return claimInfo.toBuffer()
  })

  const merkleTree = new MerkleTree(leaves)

  merkleTree.nodes

  function insertRow(row: any[])

  pool.query('INSERT INTO claims VALUES($1, $2, $3, $4)')
})

afterAll(() => {
  return clearCityDatabase()
})

/** Build a Merkle tree and check the result against the Rust implementation. */
test('Merkle tree sanity check', () => {
  expect(false).toBe(true)
})
