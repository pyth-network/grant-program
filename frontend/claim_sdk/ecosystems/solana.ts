import { Keypair, PublicKey } from '@solana/web3.js'
import { SignedMessage } from './signatures'
import nacl from 'tweetnacl'
import IDL from '../../claim_sdk/idl/token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'

const coder = new anchor.BorshCoder(IDL as any)

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

export function signDiscordMessage(
  username: string,
  claimant: PublicKey,
  dispenserGuard: Keypair
): SignedMessage {
  return hardDriveSignMessage(
    coder.types.encode('DiscordMessage', {
      username,
      claimant,
    }),
    dispenserGuard
  )
}
