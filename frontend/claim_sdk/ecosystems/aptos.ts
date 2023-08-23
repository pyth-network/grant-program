export function aptosGetFullMessage(payload: string): string {
  return 'APTOS\nmessage: '.concat(payload).concat('\nnonce: nonce')
}
