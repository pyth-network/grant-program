import { Keypair, PublicKey } from '@solana/web3.js'
import { TokenDispenserProvider } from '../claim_sdk/solana'
import { loadTestWallets } from '../claim_sdk/testWallets'
import {
  addTestWalletsToDatabase,
  clearDatabase,
  getDatabasePool,
} from '../utils/db'
import { HDNodeWallet } from 'ethers'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'

const pool = getDatabasePool()

async function main() {
  await clearDatabase(pool)
  const root = await addTestWalletsToDatabase(pool, await loadTestWallets())

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
}

main()
