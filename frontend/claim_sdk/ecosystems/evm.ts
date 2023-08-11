import { Hash } from '@keplr-wallet/crypto'
import { removeLeading0x } from 'claim_sdk'

export function splitEvmSignature(s: string): [Uint8Array, number] {
  const noLeading0x = removeLeading0x(s)
  const signature = noLeading0x.slice(0, 128)
  const recoveryId = correctEvmRecoveryId(
    parseInt(noLeading0x.slice(128, 130), 16)
  )

  return [Buffer.from(signature, 'hex'), recoveryId]
}

export function correctEvmRecoveryId(p: number): number {
  if (27 <= p && p < 30) return p - 27
  return p
}

export function uncompressedToEvmPubkey(pubkey: Uint8Array): Uint8Array {
  return Hash.keccak256(pubkey.slice(1)).slice(12)
}
