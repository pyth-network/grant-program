import { Pool } from 'pg'
import dotenv from 'dotenv'
import { TestWallet } from '../claim_sdk/testWallets'
import { ClaimInfo, Ecosystem, Ecosystems } from '../claim_sdk/claim'
import * as anchor from '@coral-xyz/anchor'
import { HASH_SIZE, MerkleTree } from '../claim_sdk/merkleTree'
dotenv.config() // Load environment variables from .env file

/** Get the database pool with the default configuration. */
export function getDatabasePool(): Pool {
  // NOTE: This uses the PG* environment variables by default to configure the connection.
  return new Pool()
}

export async function clearDatabase(pool: Pool) {
  await pool.query('DELETE FROM claims', [])
}

export async function addTestWalletsToDatabase(
  pool: Pool,
  testWallets: Record<Ecosystem, TestWallet[]>
): Promise<Buffer> {
  const claimInfos: ClaimInfo[] = Ecosystems.map(
    (ecosystem, ecosystemIndex) => {
      return testWallets[ecosystem].map((testWallet, index) => {
        return new ClaimInfo(
          ecosystem,
          testWallet.address(),
          new anchor.BN(1000000 * (ecosystemIndex + 1) + 100000 * index) // The amount of tokens is deterministic based on the order of the test wallets
        )
      })
    }
  ).flat(1)

  const merkleTree = new MerkleTree(
    claimInfos.map((claimInfo) => {
      return claimInfo.toBuffer()
    })
  )

  for (const claimInfo of claimInfos) {
    const proof = merkleTree.prove(claimInfo.toBuffer())

    await pool.query(
      'INSERT INTO claims VALUES($1::ecosystem_type, $2, $3, $4)',
      [
        claimInfo.ecosystem,
        claimInfo.identity,
        claimInfo.amount.toNumber(),
        proof,
      ]
    )
  }
  return merkleTree.root
}

function parseProof(proof: string) {
  const buffer = Buffer.from(proof, 'hex')
  const chunks = []

  if (buffer.length % HASH_SIZE !== 0) {
    throw new Error('Proof of inclusion must be a multiple of 32 bytes')
  }

  for (let i = 0; i < buffer.length; i += HASH_SIZE) {
    const chunk = Uint8Array.prototype.slice.call(buffer, i, i + HASH_SIZE)
    chunks.push(chunk)
  }
  return chunks
}
