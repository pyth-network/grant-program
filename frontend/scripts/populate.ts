import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { TokenDispenserProvider } from '../claim_sdk/solana'
import { loadAnchorWallet, loadTestWallets } from '../claim_sdk/testWallets'
import {
  addTestWalletsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'
import * as anchor from '@coral-xyz/anchor'

const pool = getDatabasePool()

async function main() {
  await clearDatabase(pool)
  const root = await addTestWalletsToDatabase(pool, await loadTestWallets())
  const dispenserGuard = anchor.web3.Keypair.generate()

  // Intialize the token dispenser
  const tokenDispenserProvider = new TokenDispenserProvider(
    'http://localhost:8899',
    await loadAnchorWallet(),
    new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'),
    {
      skipPreflight: true,
      preflightCommitment: 'processed',
      commitment: 'processed',
    }
  )
  await tokenDispenserProvider.airdrop(
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
