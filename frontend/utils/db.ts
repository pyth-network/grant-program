import { Pool } from 'pg'
import dotenv from 'dotenv'
import {
  TestEvmWallet,
  TestSolanaWallet,
  TestWallet,
} from '../claim_sdk/testWallets'
import { ClaimInfo, Ecosystem, Ecosystems } from '../claim_sdk/claim'
import { getMaxAmount } from '../claim_sdk/claim'
import * as anchor from '@coral-xyz/anchor'
import { MerkleTree } from '../claim_sdk/merkleTree'
import { BN } from 'bn.js'
const sql = require('sql') as any
dotenv.config() // Load environment variables from .env file

const CHUNK_SIZE = 1000
const SOLANA_ECOSYSTEM_INDEX = 2
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
] as const

export type SOLANA_SOURCES = 'nft' | 'defi'

export type EvmChains = typeof EVM_CHAINS[number]

export type EvmBreakdownRow = {
  chain: string
  identity: string
  amount: anchor.BN
}

export type SolanaBreakdownRow = {
  source: SOLANA_SOURCES
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
  await pool.query('DELETE FROM solana_breakdowns', [])
}

export async function addClaimInfosToDatabase(
  pool: Pool,
  claimInfos: ClaimInfo[]
): Promise<Buffer> {
  console.log('ADDING :', claimInfos.length, ' CLAIM INFOS')
  const merkleTreeStart = Date.now()
  const merkleTree = new MerkleTree(
    claimInfos.map((claimInfo) => {
      return claimInfo.toBuffer()
    })
  )
  const merkleTreeEnd = Date.now()

  console.log(
    `\n\nbuilt merkle tree time: ${merkleTreeEnd - merkleTreeStart}\n\n`
  )

  let claimInfoChunks = []
  const chunkCounts = [...Array(Math.ceil(claimInfos.length / CHUNK_SIZE))]

  const claimInfoChunksStart = Date.now()

  claimInfoChunks = chunkCounts.map((_, i) => {
    if (i % 100 === 0) {
      console.log(`\n\n making claimInfo chunk ${i}/${chunkCounts.length}\n\n`)
    }
    let chunk = claimInfos.splice(0, CHUNK_SIZE)
    return chunk.map((claimInfo) => {
      return {
        ecosystem: claimInfo.ecosystem,
        identity: claimInfo.identity,
        amount: claimInfo.amount.toString(),
        proof_of_inclusion: merkleTree.prove(claimInfo.toBuffer()),
      }
    })
  })
  const claimInfoChunksEnd = Date.now()

  console.log(
    `\n\nclaiminfoChunks time: ${claimInfoChunksEnd - claimInfoChunksStart}\n\n`
  )

  let Claims = sql.define({
    name: 'claims',
    columns: ['ecosystem', 'identity', 'amount', 'proof_of_inclusion'],
  })
  const claimsInsertStart = Date.now()
  let chunkCount = 0
  for (const claimInfoChunk of claimInfoChunks) {
    let query = Claims.insert(claimInfoChunk).toQuery()
    await pool.query(query)
    chunkCount++
    if (chunkCount % 10 === 0) {
      console.log(
        `\n\ninserted ${chunkCount}/${claimInfoChunks.length} chunks\n\n`
      )
    }
  }
  const claimsInsertEnd = Date.now()
  console.log(
    `\n\nclaimsInsert time: ${claimsInsertEnd - claimsInsertStart}\n\n`
  )
  return merkleTree.root
}

export async function addTestWalletsToDatabase(
  pool: Pool,
  testWallets: Record<Ecosystem, TestWallet[]>
): Promise<[Buffer, anchor.BN]> {
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

  const maxAmount = getMaxAmount(claimInfos)

  return [await addClaimInfosToDatabase(pool, claimInfos), maxAmount]
}

export async function addEvmBreakdownsToDatabase(
  pool: Pool,
  evmBreakdowns: EvmBreakdownRow[]
) {
  console.log('INSERTING :', evmBreakdowns.length, ' EVM BREAKDOWNS')
  const chunks = []
  while (evmBreakdowns.length) {
    chunks.push(
      evmBreakdowns.splice(0, CHUNK_SIZE).map((row) => {
        return {
          chain: row.chain,
          amount: row.amount.toString(),
          identity: row.identity,
        }
      })
    )
  }

  const EvmBreakdowns = sql.define({
    name: 'evm_breakdowns',
    columns: ['chain', 'identity', 'amount'],
  })

  for (const chunk of chunks) {
    const query = EvmBreakdowns.insert(chunk).toQuery()
    await pool.query(query)
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

export async function addSolanaBreakdownsToDatabase(
  pool: Pool,
  solanaBreakdowns: SolanaBreakdownRow[]
) {
  console.log('INSERTING :', solanaBreakdowns.length, ' SOLANA BREAKDOWNS')
  const chunks = []
  while (solanaBreakdowns.length) {
    chunks.push(
      solanaBreakdowns.splice(0, CHUNK_SIZE).map((row) => {
        return {
          source: row.source,
          amount: row.amount.toString(),
          identity: row.identity,
        }
      })
    )
  }

  const SolanaBreakdowns = sql.define({
    name: 'solana_breakdowns',
    columns: ['source', 'identity', 'amount'],
  })

  for (const chunk of chunks) {
    const query = SolanaBreakdowns.insert(chunk).toQuery()
    await pool.query(query)
  }
}

export async function addTestSolanaBreakdown(
  pool: Pool,
  testSolanaWallets: TestSolanaWallet[]
): Promise<void> {
  const claimInfos = testSolanaWallets.map(
    (testSolanaWallet, index) =>
      new ClaimInfo(
        'solana',
        testSolanaWallet.address(),
        new anchor.BN(1000000 * SOLANA_ECOSYSTEM_INDEX + 100000 * index)
      )
  )
  const rows: SolanaBreakdownRow[] = []
  for (let claimInfo of claimInfos) {
    rows.push({
      source: 'nft',
      identity: claimInfo.identity,
      amount: claimInfo.amount.div(new anchor.BN(2)),
    })

    rows.push({
      source: 'defi',
      identity: claimInfo.identity,
      amount: claimInfo.amount
        .div(new anchor.BN(2))
        .add(claimInfo.amount.mod(new anchor.BN(2))),
    })
  }
  await addSolanaBreakdownsToDatabase(pool, rows)
}
