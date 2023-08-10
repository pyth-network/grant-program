import { PublicKey } from '@solana/web3.js'
import IDL from './idl/token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'
import { removeLeading0x } from './index'
import { MerkleTree } from './merkleTree'
import { expect } from '@jest/globals'
import { ethers } from 'ethers'

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
    '0c2646cc8927c8066ad57820b52a7495fe5f3edd9788d157839d6f462efac201'
  )

  const proofs = [
    '05db84439b34e07aa468bf8b8bbf5ff041b645f1871956ddb116f119e12d9e674794eda202647bad3235182152610d734267d20ea65df96016cc2b5ce5cbc75bd1693190803b65d9dcb7243da7c29f005dd99c5cf7ca88532c6efa58822cd41e',
    '40f2287ebf92ec1621c8133d7599bf37683d698a83836eea0fc418d69cecd4bc4794eda202647bad3235182152610d734267d20ea65df96016cc2b5ce5cbc75bd1693190803b65d9dcb7243da7c29f005dd99c5cf7ca88532c6efa58822cd41e',
    '31f7368e479531298028cf81b2234d035d66de64211a9017dc8f3adb94f67fb6e1cd91d87b9787952ddec91cad28c438fa2fbe7798f94539835bf31c007b334dd1693190803b65d9dcb7243da7c29f005dd99c5cf7ca88532c6efa58822cd41e',
    '8b113bb2a3350ab320e5204d9e0f175c7408f37a986400bec4c3c30400814508e1cd91d87b9787952ddec91cad28c438fa2fbe7798f94539835bf31c007b334dd1693190803b65d9dcb7243da7c29f005dd99c5cf7ca88532c6efa58822cd41e',
    'a5cde6cf3245f7746ce9b893f920d0e975d327ade3c6c1f5c6ea96c54dba7ffb04fe37f3f3f18b492d9512edfe9e481d66d95cec9634591e78915bb213b6514edfd6b2776dc48b17f0161f9dea3da4615cbe333530e1942cc34131e3358d393c',
    '6b3349e63b902f9e8b2b27aebf82cd92c0fa47dee4ec101a7cd6153f45bd727104fe37f3f3f18b492d9512edfe9e481d66d95cec9634591e78915bb213b6514edfd6b2776dc48b17f0161f9dea3da4615cbe333530e1942cc34131e3358d393c',
  ]

  for (let i = 0; i < claimInfos.length; i++) {
    expect(merkleTree.prove(claimInfos[i]).toString('hex')).toBe(proofs[i])
  }
})
