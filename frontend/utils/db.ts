import { Pool } from 'pg'
import dotenv from 'dotenv'
import { TestEvmWallet, TestWallet } from '../claim_sdk/testWallets'
import { ClaimInfo, Ecosystem, Ecosystems } from '../claim_sdk/claim'
import * as anchor from '@coral-xyz/anchor'
import { MerkleTree } from '../claim_sdk/merkleTree'
dotenv.config() // Load environment variables from .env file

const EVM_ECOSYSTEM_INDEX = 3
export const EVM_CHAINS = [
  'optimism-mainnet',
  'arbitrum-mainnet',
  'cronos-mainnet',
  'zksync-mainnet',
  'bsc-mainnet',
  'base-mainnet',
  'evmos-mainnet',
  'mantle-mainnet',
  'linea-mainnet',
  'polygon-zkevm-mainnet',
  'avalanche-mainnet',
  'matic-mainnet',
  'aurora-mainnet',
  'eth-mainnet',
  'confluxespace-mainnet',
  'celo-mainnet',
  'meter-mainnet',
  'gnosis-mainnet',
  'kcc-mainnet',
  'wemix-mainnet',
]

export type EvmBreakdownRow = {
  chain: string
  identity: string
  amount: anchor.BN
}

/** Get the database pool with the default configuration. */
export function getDatabasePool(): Pool {
  // NOTE: This uses the PG* environment variables by default to configure the connection.
  return new Pool()
}

export async function clearDatabase(pool: Pool) {
  await pool.query('DELETE FROM claims', [])
  await pool.query('DELETE FROM evm_breakdowns', [])
}

export async function addClaimInfosToDatabase(
  pool: Pool,
  claimInfos: ClaimInfo[]
): Promise<Buffer> {
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
        claimInfo.amount.toString(),
        proof,
      ]
    )
  }
  return merkleTree.root
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

  return addClaimInfosToDatabase(pool, claimInfos)
}

export async function addEvmBreakdownsToDatabase(
  pool: Pool,
  evmBreakdowns: EvmBreakdownRow[]
) {
  for (const evmBreakdown of evmBreakdowns) {
    await pool.query(
      'INSERT INTO evm_breakdowns VALUES($1::evm_chain, $2, $3)',
      [
        evmBreakdown.chain,
        evmBreakdown.identity,
        evmBreakdown.amount.toString(),
      ]
    )
  }
}

export async function addTestEvmBreakdown(
  pool: Pool,
  testEvmWallets: TestEvmWallet[]
): Promise<void> {
  const claimInfos = testEvmWallets.map(
    (testEvmWallet, index) =>
      new ClaimInfo(
        'evm',
        testEvmWallet.address(),
        new anchor.BN(1000000 * EVM_ECOSYSTEM_INDEX + 100000 * index)
      )
  )
  const rows: EvmBreakdownRow[] = []
  for (let claimInfo of claimInfos) {
    const shuffled = EVM_CHAINS.map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)

    rows.push({
      chain: shuffled[0],
      identity: claimInfo.identity,
      amount: claimInfo.amount.div(new anchor.BN(3)),
    })
    rows.push({
      chain: shuffled[1],
      identity: claimInfo.identity,
      amount: claimInfo.amount.div(new anchor.BN(3)),
    })
    rows.push({
      chain: shuffled[2],
      identity: claimInfo.identity,
      amount: claimInfo.amount
        .div(new anchor.BN(3))
        .add(claimInfo.amount.mod(new anchor.BN(3))),
    })
  }
  await addEvmBreakdownsToDatabase(pool, rows)
}
