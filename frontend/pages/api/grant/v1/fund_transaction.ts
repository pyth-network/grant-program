import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Keypair, Version, VersionedTransaction } from '@solana/web3.js'
import type { NextApiRequest, NextApiResponse } from 'next'

const wallet = new NodeWallet(
  Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.FUNDER_KEYPAIR!))
  )
)

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

  try {
    transactions = data.map((serializedTx: any) => {
      return VersionedTransaction.deserialize(Buffer.from(serializedTx))
    })
  } catch {
    return res.status(400).json({
      error: 'Failed to deserialize transactions',
    })
  }

  // TODO : SOME VALIDATION HERE

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
}
