import { SignMessageArgs } from '@wagmi/core'
import { removeLeading0x } from '../index'
import { evmGetFullMessage, splitEvmSignature } from './evm'
import { ethers } from 'ethers'
import fs from 'fs'
import { Pubkey } from '@cosmjs/amino'

export type SignedMessage = {
  publicKey: Uint8Array
  signature: Uint8Array
  // recoveryId is undefined for ed25519
  recoveryId: number | undefined
  fullMessage: Uint8Array
}

export function evmBuildSignedMessage(
  response: `0x${string}`,
  address: `0x${string}`,
  payload: string
): SignedMessage {
  const [signature, recoveryId] = splitEvmSignature(response)
  return {
    publicKey: Buffer.from(removeLeading0x(address), 'hex'),
    signature,
    recoveryId,
    fullMessage: evmGetFullMessage(payload),
  }
}

// export function cosmosBuildSignedMessage(
//     pub_key: Pubkey,
//
//     payload: string,
// ): SignedMessage {
//
//   return
//
// }
