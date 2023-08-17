import { removeLeading0x } from '../index'
import {
  evmGetFullMessage,
  splitEvmSignature,
  uncompressedToEvmPubkey,
} from './evm'
import { Pubkey as AminoPubkey } from '@cosmjs/amino'
import {
  cosmosGetFullMessage,
  extractChainId,
  extractRecoveryId,
  getUncompressedPubkey,
} from './cosmos'
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
  address: string,
  payload: string,
  signatureBase64: string
): SignedMessage {
  const fullMessage = cosmosGetFullMessage(address, payload)
  const signature = Buffer.from(signatureBase64, 'base64')
  const publicKey = getUncompressedPubkey(Buffer.from(pub_key.value, 'base64'))
  const chainId = extractChainId(address)
  if (chainId == 'inj') {
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
