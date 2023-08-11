import { messageWithIntent, IntentScope } from '@mysten/sui.js/cryptography'
import { bcs } from '@mysten/sui.js/bcs'

export function splitSignatureAndPubkey(
  buffer: Uint8Array
): [Uint8Array, Uint8Array] {
  return [buffer.slice(1, 65), buffer.slice(65)]
}

export function SuiGetFullMessage(message: string): Uint8Array {
  return messageWithIntent(
    IntentScope.PersonalMessage,
    bcs.ser(['vector', 'u8'], Buffer.from(message, 'utf-8')).toBytes()
  )
}
