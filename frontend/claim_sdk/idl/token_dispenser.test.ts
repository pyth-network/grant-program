import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { TokenDispenser, IDL } from './token_dispenser'
import * as anchor from '@coral-xyz/anchor'

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
  const buffer = program.coder.types.encode('Identity', {
    discord: { username: '1234' },
  })
  console.log(buffer)
}

main()

test('Anchor sanity check', (done) => {
  const program = new anchor.Program(
    IDL as TokenDispenser,
    new PublicKey(0),
    new anchor.AnchorProvider(
      new Connection('https://api.devnet.solana.com'),
      new anchor.Wallet(new Keypair()),
      anchor.AnchorProvider.defaultOptions()
    )
  )

  let buffer = program.coder.types.encode('Identity', {
    discord: { username: '1234' },
  })
  expect(buffer).toStrictEqual(Buffer.from([0, 4, 0, 0, 0, 49, 50, 51, 52]))

  buffer = program.coder.types.encode('MerklePath<SolanaHasher>', {
    data: [Buffer.alloc(32, 1), Buffer.alloc(32, 2)],
  })
  expect(buffer).toStrictEqual(
    Buffer.concat([
      Buffer.from([2, 0, 0, 0]),
      Buffer.alloc(32, 1),
      Buffer.alloc(32, 2),
    ])
  )
  done()
})
