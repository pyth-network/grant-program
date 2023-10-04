import { Keypair, PublicKey } from '@solana/web3.js'
import { TokenDispenserProvider } from '../claim_sdk/solana'
import { envOrErr } from '../claim_sdk/index'
import {
  EVM_CHAINS,
  addClaimInfosToDatabase,
  addEvmBreakdownsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'
import fs from 'fs'
import Papa from 'papaparse'

import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import BN from 'bn.js'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { EvmBreakdownRow } from '../utils/db'
import assert from 'assert'

const pool = getDatabasePool()

// The config is read from these env variables
const ENDPOINT = envOrErr('ENDPOINT')
const PROGRAM_ID = envOrErr('PROGRAM_ID')
const DISPENSER_GUARD = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(envOrErr('DISPENSER_GUARD')))
)
const FUNDER_KEYPAIR = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(envOrErr('FUNDER_KEYPAIR')))
)
const CLUSTER = envOrErr('CLUSTER')
const DEPLOYER_WALLET = Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(fs.readFileSync(envOrErr('DEPLOYER_WALLET'), 'utf-8'))
  )
)
const PYTH_MINT = new PublicKey(envOrErr('PYTH_MINT'))
const PYTH_TREASURY = new PublicKey(envOrErr('PYTH_TREASURY'))
const CSV_CLAIMS = envOrErr('CSV_CLAIMS')
const CSV_EVM_BREAKDOWNS = envOrErr('CSV_EVM_BREAKDOWNS')

function checkClaimsMatchEvmBreakdown(
  claimInfos: ClaimInfo[],
  evmBreakDowns: EvmBreakdownRow[]
) {
  const sum: { [identity: string]: BN } = {}
  for (const evmBreakDownRow of evmBreakDowns) {
    if (sum[evmBreakDownRow.identity] == undefined) {
      sum[evmBreakDownRow.identity] = new BN(0)
    }
    sum[evmBreakDownRow.identity] = sum[evmBreakDownRow.identity].add(
      evmBreakDownRow.amount
    )
  }
  const evmClaims = claimInfos.filter((claimInfo) => {
    return claimInfo.ecosystem === 'evm'
  })
  assert(
    Object.keys(sum).length === evmClaims.length,
    'Number of evm identities in CSV file does not match number of identities in evm_breakdowns table'
  )

  for (const evmClaim of evmClaims) {
    assert(
      sum[evmClaim.identity].eq(evmClaim.amount),
      `Breakdown for ${evmClaim.identity} does not match total amount`
    )
  }
}

// Requirements for this script :
// - Two csv files : one for claims and one for evm breakdowns
// - Program has been deployed
// - DB has been migrated

// Extra steps after running this script :
// - Make sure the tokens are in the treasury account
// - Make sure the treasury account has the config account as its delegate
async function main() {
  await clearDatabase(pool)

  // Load claims from csv file
  const csvClaims = Papa.parse(fs.readFileSync(CSV_CLAIMS, 'utf-8'), {
    header: true,
  }) // Assumes ecosystem, identity, amount are the headers
  const claimsData = csvClaims.data as {
    ecosystem: string
    identity: string
    amount: string
  }[]
  assert(
    new Set(claimsData.map((row) => row['identity'])).size == claimsData.length,
    'Duplicate addresses in CSV file'
  )
  assert(
    claimsData.every((row) => {
      return [
        'solana',
        'evm',
        'discord',
        'cosmwasm',
        'aptos',
        'sui',
        'injective',
      ].includes(row['ecosystem'])
    }),
    'A row has an unexisting ecosystem'
  )
  const claimInfos = claimsData.map(
    (row) =>
      new ClaimInfo(
        row['ecosystem'] as Ecosystem,
        row['identity'],
        new BN(row['amount'])
      )
  ) // Cast for ecosystem ok because of assert above

  // Load evmBreakdowns from csv file
  const csvEvmBreakdowns = Papa.parse(
    fs.readFileSync(CSV_EVM_BREAKDOWNS, 'utf-8'),
    { header: true }
  ) // Assumes chain, identity, amount are the headers
  const evmBreakdownsData = csvEvmBreakdowns.data as {
    chain: string
    identity: string
    amount: string
  }[]
  assert(
    evmBreakdownsData.every((row) => {
      return EVM_CHAINS.includes(row['chain'])
    })
  )
  const evmBreakDowns: EvmBreakdownRow[] = evmBreakdownsData.map((row) => {
    return {
      chain: row['chain'],
      identity: row['identity'],
      amount: new BN(row['amount']),
    }
  })

  checkClaimsMatchEvmBreakdown(claimInfos, evmBreakDowns)

  // Add data to database
  const root = await addClaimInfosToDatabase(pool, claimInfos)
  await addEvmBreakdownsToDatabase(pool, evmBreakDowns)

  // Intialize the token dispenser
  const tokenDispenserProvider = new TokenDispenserProvider(
    ENDPOINT,
    new NodeWallet(DEPLOYER_WALLET),
    new PublicKey(PROGRAM_ID),
    {
      skipPreflight: true,
      preflightCommitment: 'processed',
      commitment: 'processed',
    }
  )
  await tokenDispenserProvider.initialize(
    root,
    PYTH_MINT,
    PYTH_TREASURY,
    DISPENSER_GUARD.publicKey,
    FUNDER_KEYPAIR.publicKey
  )
}

main()
