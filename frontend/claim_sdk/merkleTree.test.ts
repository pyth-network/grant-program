import { PublicKey } from '@solana/web3.js'
import IDL from './idl/token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'
import { removeLeading0x } from './index'
import { MerkleTree } from './merkleTree'
import { expect } from '@jest/globals'
import { ethers } from 'ethers'

const coder = new anchor.BorshCoder(IDL as any)
/** Build a Merkle tree and check the result against the Rust implementation. */
test('Merkle tree sanity check', () => {
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
          pubkey: new PublicKey(
            '3kzAHeiucNConBwKQVHyLcG3soaMzSZkvs4y14fmMgKL'
          ).toBuffer(),
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
      identity: {
        aptos: {
          address: Buffer.from(
            '7e7544df4fc42107d4a60834685dfd9c1e6ff048f49fe477bc19c1551299d5cb',
            'hex'
          ),
        },
      },
    }),
    coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(5000),
      identity: {
        sui: {
          address: Buffer.from(
            '87a7ec050788fbaa9cd842b4cf9915949931af94806404bba661f1ac3d338148',
            'hex'
          ),
        },
      },
    }),
  ]

  // see the Rust test test_merkle_tree.rs for the expected result of this merkle tree computation.
  // Use the following command to see the println output from that test:
  //   cargo test test_merkle_tree -- --nocapture
  const merkleTree = new MerkleTree(claimInfos)
  expect(merkleTree.nodes[1].toString('hex')).toBe(
    '6632225fce70f22b2b6d2781604a9d72e3636254'
  )

  const proofs = [
    '05db84439b34e07aa468bf8b8bbf5ff041b645f188bfd7f3f8d35ead2d7ee26e71b6069f62a1ac95621cac2b7a52904711acef2db3bf0a8908cd5c72',
    '40f2287ebf92ec1621c8133d7599bf37683d698a88bfd7f3f8d35ead2d7ee26e71b6069f62a1ac95621cac2b7a52904711acef2db3bf0a8908cd5c72',
    '31f7368e479531298028cf81b2234d035d66de64a751a0ee5c54aef476c7a948551392d328537764621cac2b7a52904711acef2db3bf0a8908cd5c72',
    '8b113bb2a3350ab320e5204d9e0f175c7408f37aa751a0ee5c54aef476c7a948551392d328537764621cac2b7a52904711acef2db3bf0a8908cd5c72',
    'a5cde6cf3245f7746ce9b893f920d0e975d327ada8a1180177cf30b2c0bebbb1adfe8f7985d051d255658e428237f959033a2cae47df61ee3a2ac710',
    '6b3349e63b902f9e8b2b27aebf82cd92c0fa47dea8a1180177cf30b2c0bebbb1adfe8f7985d051d255658e428237f959033a2cae47df61ee3a2ac710',
  ]

  for (let i = 0; i < claimInfos.length; i++) {
    expect(merkleTree.prove(claimInfos[i]).toString('hex')).toBe(proofs[i])
  }
})

describe('Claim Info Evm Test', () => {
  it('should generate the same claim info buffer for an evm address regardless of case', async () => {
    const evmAddressStr = '0xb80Eb09f118ca9Df95b2DF575F68E41aC7B9E2f8'
    const evmClaimInfo0 = coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(2000),
      identity: {
        evm: {
          pubkey: Buffer.from(removeLeading0x(evmAddressStr), 'hex'),
        },
      },
    })

    const evmClaimInfo1 = coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(2000),
      identity: {
        evm: {
          pubkey: Buffer.from(
            removeLeading0x(evmAddressStr.toLowerCase()),
            'hex'
          ),
        },
      },
    })

    const evmClaimInfo2 = coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(2000),
      identity: {
        evm: {
          pubkey: Array.from(ethers.getBytes(evmAddressStr)),
        },
      },
    })

    const evmClaimInfo3 = coder.types.encode('ClaimInfo', {
      amount: new anchor.BN(2000),
      identity: {
        evm: {
          pubkey: Array.from(ethers.getBytes(evmAddressStr.toLowerCase())),
        },
      },
    })

    expect(evmClaimInfo0.equals(evmClaimInfo1)).toBe(true)
    expect(evmClaimInfo0.equals(evmClaimInfo2)).toBe(true)
    expect(evmClaimInfo0.equals(evmClaimInfo3)).toBe(true)

    const merkleTree0 = new MerkleTree([evmClaimInfo0])
    const merkleTree1 = new MerkleTree([evmClaimInfo1])
    const merkleTree2 = new MerkleTree([evmClaimInfo2])
    const merkleTree3 = new MerkleTree([evmClaimInfo3])
    expect(merkleTree0.nodes[1].toString('hex')).toBe(
      merkleTree1.nodes[1].toString('hex')
    )
    expect(merkleTree0.nodes[1].toString('hex')).toBe(
      merkleTree2.nodes[1].toString('hex')
    )
    expect(merkleTree0.nodes[1].toString('hex')).toBe(
      merkleTree3.nodes[1].toString('hex')
    )
  })
})
