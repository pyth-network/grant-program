import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { TokenDispenser } from './token_dispenser'
import * as anchor from '@coral-xyz/anchor'
import IDL from './token_dispenser.json'

export async function main() {
  const program = new anchor.Program(
    IDL as TokenDispenser,
    new PublicKey(0),
    new anchor.AnchorProvider(
      new Connection('https://api.devnet.solana.com'),
      new anchor.Wallet(new Keypair()),
      anchor.AnchorProvider.defaultOptions()
    )
  )
  program.coder.types.encode('Identity', { Discord: '1234' })
}

main()
