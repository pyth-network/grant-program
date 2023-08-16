import { SignMessageArgs } from '@wagmi/core'
import { removeLeading0x } from '../index'
import {
  evmGetFullMessage,
  splitEvmSignature,
  uncompressedToEvmPubkey,
} from './evm'
import { ethers } from 'ethers'
import fs from 'fs'
import { Pubkey as AminoPubkey, StdSignDoc } from '@cosmjs/amino'
import { serializeSignDoc } from '@keplr-wallet/cosmos'
import { extractRecoveryId, getUncompressedPubkey } from './cosmos'
import { Hash } from '@keplr-wallet/crypto'

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

export function cosmwasmBuildSignedMessage(
  pub_key: AminoPubkey,
  signed: StdSignDoc,
  signatureBase64: string,
  chainName: string
): SignedMessage {
  const fullMessage = serializeSignDoc(signed)
  const signature = Buffer.from(signatureBase64, 'base64')
  const publicKey = getUncompressedPubkey(Buffer.from(pub_key.value, 'base64'))
  if (chainName == 'injective') {
    return {
      publicKey: uncompressedToEvmPubkey(publicKey),
      signature,
      recoveryId: extractRecoveryId(
        signature,
        publicKey,
        Hash.keccak256(fullMessage)
      ),
      fullMessage,
    }
  } else {
    return {
      publicKey,
      signature,
      recoveryId: extractRecoveryId(
        signature,
        publicKey,
        Hash.sha256(fullMessage)
      ),
      fullMessage,
    }
  }
}
