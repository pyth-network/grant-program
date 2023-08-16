import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import IDL from '../../../../claim_sdk/idl/token_dispenser.json'
import * as anchor from '@coral-xyz/anchor'
import { Keypair, PublicKey } from '@solana/web3.js'
import { hardDriveSignMessage } from '../../../../claim_sdk/ecosystems/solana'

const dispenserGuard = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.DISPENSER_GUARD!))
)
const coder = new anchor.BorshCoder(IDL as any)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (typeof req.query.publicKey !== 'string') {
    res.status(400).json({
      error: "Must provide the 'publicKey' query parameter",
    })
    return
  }

  try {
    new PublicKey(req.query.publicKey)
  } catch {
    res.status(400).json({
      error: "Invalid 'publicKey' query parameter",
    })
    return
  }

  const publicKey = new PublicKey(req.query.publicKey)
  const session = await getServerSession(req, res, authOptions)

  if (session && session.user) {
    const signedMessage = hardDriveSignMessage(
      coder.types.encode('DiscordMessage', {
        username: session.user.name,
        claimant: publicKey,
      }),
      dispenserGuard
    )
    res.status(200).json({
      signature: Buffer.from(signedMessage.signature).toString('hex'),
      publicKey: Buffer.from(signedMessage.publicKey).toString('hex'),
      fullMessage: Buffer.from(signedMessage.fullMessage).toString('hex'),
    })
  } else {
    res.status(403).json({
      error: 'You must be logged in with Discord to access this endpoint',
    })
  }
}
