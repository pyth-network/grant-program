import { ProjectivePoint, Signature } from '@noble/secp256k1'
import { makeADR36AminoSignDoc, serializeSignDoc } from '@keplr-wallet/cosmos'

export function getUncompressedPubkey(pubkey: Uint8Array): Uint8Array {
  const point = ProjectivePoint.fromHex(pubkey)
  return point.toRawBytes(false)
}

export function cosmosGetMessageWithMetadata(
  address: string,
  message: string
): Uint8Array {
  return serializeSignDoc(makeADR36AminoSignDoc(address, message))
}

export function extractRecoveryId(
  signature: Uint8Array,
  publicKey: Uint8Array,
  hashedMessage: Uint8Array
): number {
  const sig = Signature.fromCompact(signature)
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
