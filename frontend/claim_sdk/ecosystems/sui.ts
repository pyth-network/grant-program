export function splitSignatureAndPubkey(
  buffer: Uint8Array
): [Uint8Array, Uint8Array] {
  return [buffer.slice(1, 65), buffer.slice(65)]
}
