import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { TokenDispenserProvider, airdrop } from '../claim_sdk/solana'
import { loadAnchorWallet, loadTestWallets } from '../claim_sdk/testWallets'
import {
  addTestWalletsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'
import * as anchor from '@coral-xyz/anchor'
import { envOrErr } from 'claim_sdk'

const pool = getDatabasePool()

const ENDPOINT = envOrErr('ENDPOINT')
const PROGRAM_ID = envOrErr('PROGRAM_ID')

async function main() {
  await clearDatabase(pool)
  const root = await addTestWalletsToDatabase(pool, await loadTestWallets())
  const dispenserGuard = anchor.web3.Keypair.generate()

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
  const mintAndTreasury = await tokenDispenserProvider.setupMintAndTreasury()
  await tokenDispenserProvider.initialize(
    root,
    mintAndTreasury.mint.publicKey,
    mintAndTreasury.treasury,
    dispenserGuard.publicKey
  )
}

main()
