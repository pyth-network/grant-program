import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Keypair, VersionedTransaction } from '@solana/web3.js'
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
  const transactions: VersionedTransaction[] = data.map((serializedTx: any) => {
    return VersionedTransaction.deserialize(Buffer.from(serializedTx, 'base64'))
  })
  // DO SOME VALIDATION HERE
  const resultingTransactions = await wallet.signAllTransactions(transactions)
  res.status(200).json(
    resultingTransactions.map((tx) => {
      return Buffer.from(tx.serialize())
    })
  )
}
