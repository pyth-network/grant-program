import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { loadFunderWallet } from '../../../../claim_sdk/testWallets'
import {
  ComputeBudgetProgram,
  Ed25519Program,
  Keypair,
  PublicKey,
  Secp256k1Program,
  VersionedTransaction,
} from '@solana/web3.js'
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkTransactions } from '../../../../utils/verifyTransaction'

const wallet = process.env.FUNDER_KEYPAIR
  ? new NodeWallet(
      Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.FUNDER_KEYPAIR))
      )
    )
  : loadFunderWallet()

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!)

const WHITELISTED_PROGRAMS: PublicKey[] = [
  PROGRAM_ID,
  Secp256k1Program.programId,
  Ed25519Program.programId,
  ComputeBudgetProgram.programId,
]

export default async function handlerFundTransaction(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const data = req.body
  let transactions: VersionedTransaction[] = []
  let signedTransactions: VersionedTransaction[] = []

  if (data.length >= 10) {
    return res.status(400).json({
      error: 'Too many transactions',
    })
  }

  try {
    transactions = data.map((serializedTx: any) => {
      return VersionedTransaction.deserialize(Buffer.from(serializedTx))
    })
  } catch {
    return res.status(400).json({
      error: 'Failed to deserialize transactions',
    })
  }

  if (checkTransactions(transactions, PROGRAM_ID, WHITELISTED_PROGRAMS)) {
    try {
      signedTransactions = await wallet.signAllTransactions(transactions)
    } catch {
      return res.status(400).json({
        error:
          'Failed to sign transactions, make sure the transactions have the right funder',
      })
    }

    return res.status(200).json(
      signedTransactions.map((tx) => {
        return Buffer.from(tx.serialize())
      })
    )
  } else {
    return res.status(403).json({ error: 'Unauthorized transaction' })
  }
}
