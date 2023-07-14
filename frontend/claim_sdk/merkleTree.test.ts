import { PublicKey } from '@solana/web3.js'
import IDL from './idl/token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'
import { removeLeading0x } from './index'
import { MerkleTree } from './merkleTree'

/** Build an arbitrary Merkle tree that we also build in the Rust tests, the comparison is not automated though */
test('Merkle tree sanity check', (done) => {
  const coder = new anchor.BorshCoder(IDL as any)
  let claimInfos = [
    coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(4000),
      identity: {
        cosmwasm: { address: 'cosmos1lv3rrn5trdea7vs43z5m4y34d5r3zxp484wcpu' },
      },
    }),
    coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(1000),
      identity: { discord: { username: 'pepito' } },
    }),
    coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(1000),
      identity: {
        solana: {
          pubkey: new PublicKey('3kzAHeiucNConBwKQVHyLcG3soaMzSZkvs4y14fmMgKL'),
        },
      },
    }),
    coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(2000),
      identity: {
        evm: {
          pubkey: Buffer.from(
            removeLeading0x('0xf3f9225A2166861e745742509CED164183a626d7'),
            'hex'
          ),
        },
      },
    }),
    coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(3000),
      identity: { aptos: {} },
    }),
  ]

  const merkleTree = new MerkleTree(claimInfos)
  console.log(
    'Merkle root from JS, check this against the output of the Rust test test_merkle_tree.rs :',
    merkleTree.nodes[1].toString('hex')
  )
  done()
})
