import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { TokenDispenserProvider, airdrop } from '../claim_sdk/solana'
import {
  TestEvmWallet,
  loadAnchorWallet,
  loadTestWallets,
} from '../claim_sdk/testWallets'
import { envOrErr } from '../claim_sdk/index'
import {
  addTestEvmBreakdown,
  addTestWalletsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'

const pool = getDatabasePool()

const ENDPOINT = envOrErr('ENDPOINT')
const PROGRAM_ID = envOrErr('PROGRAM_ID')
const DISPENSER_GUARD = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(envOrErr('DISPENSER_GUARD')))
)
const FUNDER = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(envOrErr('FUNDER_KEYPAIR')))
)
const PGHOST = envOrErr('PGHOST')

async function main() {
  if (PGHOST != 'localhost') {
    throw new Error('This script is only intended to be run on localhost')
  }

  await clearDatabase(pool)
  const testWallets = await loadTestWallets()
  const root = await addTestWalletsToDatabase(pool, testWallets)
  await addTestEvmBreakdown(pool, testWallets.evm as TestEvmWallet[])

  // Intialize the token dispenser
  const tokenDispenserProvider = new TokenDispenserProvider(
    ENDPOINT,
    loadAnchorWallet(),
    new PublicKey(PROGRAM_ID),
    {
      skipPreflight: true,
      preflightCommitment: 'processed',
      commitment: 'processed',
    }
  )
  await airdrop(
    tokenDispenserProvider.connection,
    LAMPORTS_PER_SOL,
    tokenDispenserProvider.claimant
  )
  await airdrop(
    tokenDispenserProvider.connection,
    LAMPORTS_PER_SOL,
    FUNDER.publicKey
  )
  const mintAndTreasury = await tokenDispenserProvider.setupMintAndTreasury()
  await tokenDispenserProvider.initialize(
    root,
    mintAndTreasury.mint.publicKey,
    mintAndTreasury.treasury,
    DISPENSER_GUARD.publicKey,
    FUNDER.publicKey
  )
}

main()
