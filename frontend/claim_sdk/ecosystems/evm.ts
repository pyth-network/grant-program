import { removeLeading0x } from 'claim_sdk'

export function splitEvmSignature(s: string): [Uint8Array, number] {
  let noLeading0x = removeLeading0x(s)
  let signature = noLeading0x.slice(0, 128)
  let recoveryId = correctEvmRecoveryId(
    parseInt(noLeading0x.slice(128, 130), 16)
  )

  return [Buffer.from(signature, 'hex'), recoveryId]
}

export function correctEvmRecoveryId(p: number): number {
  if (27 <= p && p < 30) return p - 27
  return p
}
