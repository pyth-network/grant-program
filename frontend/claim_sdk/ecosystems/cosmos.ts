import { ProjectivePoint, Signature } from '@noble/secp256k1'

export function getUncompressedPubkey(pubkey: Uint8Array): Uint8Array {
  const point = ProjectivePoint.fromHex(pubkey)
  return point.toRawBytes(false)
}
