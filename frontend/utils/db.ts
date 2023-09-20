import { Pool } from 'pg'
import dotenv from 'dotenv'
import { TestEvmWallet, TestWallet } from '../claim_sdk/testWallets'
import { ClaimInfo, Ecosystem, Ecosystems } from '../claim_sdk/claim'
import * as anchor from '@coral-xyz/anchor'
import { MerkleTree } from '../claim_sdk/merkleTree'
dotenv.config() // Load environment variables from .env file

const EVM_ECOSYSTEM_INDEX = 3

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

export async function addTestEvmBreakdown(
  pool: Pool,
  testEvmWallets: TestEvmWallet[]
): Promise<void> {
  const rows: { chain: string; identity: string; amount: number }[] = []
  for (let i = 0; i < testEvmWallets.length; i++) {
    const totalAmount = 1000000 * EVM_ECOSYSTEM_INDEX + 100000 * i
    rows.push({
      chain: 'optimism',
      identity: testEvmWallets[i].address(),
      amount: totalAmount / 3,
    })
    rows.push({
      chain: 'ethereum',
      identity: testEvmWallets[i].address(),
      amount: totalAmount / 3,
    })
    rows.push({
      chain: 'arbitrum',
      identity: testEvmWallets[i].address(),
      amount: totalAmount / 3 + (totalAmount % 3),
    })
  }
  for (const row of rows) {
    await pool.query(
      'INSERT INTO evm_breakdowns VALUES($1::evm_chain, $2, $3)',
      [row.chain, row.identity, row.amount]
    )
  }
}
