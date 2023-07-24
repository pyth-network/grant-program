import { PublicKey } from '@solana/web3.js'
import IDL from './idl/token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'
import { removeLeading0x } from './index'
import { MerkleTree } from './merkleTree'
import { expect } from '@jest/globals'

/** Build a Merkle tree and check the result against the Rust implementation. */
test('Merkle tree sanity check', () => {
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

  // see the Rust test test_merkle_tree.rs for the expected result of this merkle tree computation.
  // Use the command: cargo test test_merkle_tree -- --nocapture
  const merkleTree = new MerkleTree(claimInfos)
  expect(merkleTree.nodes[1].toString('hex')).toBe(
    'da2c16a403ad559921906102da13add419b043c2199ec8ff00685e52a91b680f'
  )

  const proofs = [
    '05db84439b34e07aa468bf8b8bbf5ff041b645f1871956ddb116f119e12d9e674794eda202647bad3235182152610d734267d20ea65df96016cc2b5ce5cbc75bf2456decdf7c8a58343e863c9d6be0737e2c5a9a7badb16016836b3a77e9e569',
    '40f2287ebf92ec1621c8133d7599bf37683d698a83836eea0fc418d69cecd4bc4794eda202647bad3235182152610d734267d20ea65df96016cc2b5ce5cbc75bf2456decdf7c8a58343e863c9d6be0737e2c5a9a7badb16016836b3a77e9e569',
    '31f7368e479531298028cf81b2234d035d66de64211a9017dc8f3adb94f67fb6e1cd91d87b9787952ddec91cad28c438fa2fbe7798f94539835bf31c007b334df2456decdf7c8a58343e863c9d6be0737e2c5a9a7badb16016836b3a77e9e569',
    '8b113bb2a3350ab320e5204d9e0f175c7408f37a986400bec4c3c30400814508e1cd91d87b9787952ddec91cad28c438fa2fbe7798f94539835bf31c007b334df2456decdf7c8a58343e863c9d6be0737e2c5a9a7badb16016836b3a77e9e569',
    'f2ee15ea639b73fa3db9b34a245bdfa015c260c598b211bf05a1ecc4b3e3b4f204fe37f3f3f18b492d9512edfe9e481d66d95cec9634591e78915bb213b6514edfd6b2776dc48b17f0161f9dea3da4615cbe333530e1942cc34131e3358d393c',
  ]

  for (let i = 0; i < claimInfos.length; i++) {
    expect(merkleTree.prove(claimInfos[i]).toString('hex')).toBe(proofs[i])
  }
})
