import { Keypair } from '@solana/web3.js'
import { SignedMessage } from './signatures'
import nacl from 'tweetnacl'

export function hardDriveSignMessage(
  fullMessage: Uint8Array,
  keypair: Keypair
): SignedMessage {
  return {
    publicKey: keypair.publicKey.toBytes(),
    signature: nacl.sign.detached(fullMessage, keypair.secretKey),
    recoveryId: undefined,
    fullMessage,
  }
}
