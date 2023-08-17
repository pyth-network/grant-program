import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { TokenDispenserProvider } from '../claim_sdk/solana'
import { loadTestWallets } from '../claim_sdk/testWallets'
import {
  addTestWalletsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'
import * as anchor from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'

const pool = getDatabasePool()

async function main() {
  await clearDatabase(pool)
  const root = await addTestWalletsToDatabase(pool, await loadTestWallets())
  const dispenserGuard = anchor.web3.Keypair.generate()

  // Intialize the token dispenser
  const tokenDispenserProvider = new TokenDispenserProvider(
    process.env.ENDPOINT!,
    new NodeWallet(new Keypair()),
    new PublicKey(process.env.PROGRAM_ID!),
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
  console.log('MINT ', mintAndTreasury.mint.publicKey.toString())
  await tokenDispenserProvider.initialize(
    root,
    mintAndTreasury.mint.publicKey,
    mintAndTreasury.treasury,
    dispenserGuard.publicKey
  )
}

main()
