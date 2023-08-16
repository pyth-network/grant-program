import { secp256k1 } from '@noble/curves/secp256k1'
import { makeADR36AminoSignDoc, serializeSignDoc } from '@keplr-wallet/cosmos'

const BECH32_SEPARATOR = '1'
export function getUncompressedPubkey(pubkey: Uint8Array): Uint8Array {
  const point = secp256k1.ProjectivePoint.fromHex(pubkey)
  return point.toRawBytes(false)
}

export function cosmosGetFullMessage(
  address: string,
  payload: string
): Uint8Array {
  return serializeSignDoc(makeADR36AminoSignDoc(address, payload))
}

export function extractRecoveryId(
  signature: Uint8Array,
  publicKey: Uint8Array,
  hashedMessage: Uint8Array
): number {
  const sig = secp256k1.Signature.fromCompact(signature)
  for (let recoveryId = 0; recoveryId < 4; recoveryId++) {
    const recovered = sig
      .addRecoveryBit(recoveryId)
      .recoverPublicKey(hashedMessage)
    if (
      Buffer.from(recovered.toRawBytes(false)).equals(Buffer.from(publicKey))
    ) {
      return recoveryId
    }
  }
  throw new Error('Could not find recovery id')
}

export function extractChainId(address: string): string {
  const words = address.split(BECH32_SEPARATOR)
  if (words.length < 2) {
    throw new Error('Invalid bech32 address')
  }
  return words[0]
}
