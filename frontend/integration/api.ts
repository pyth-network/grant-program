import { VersionedTransaction } from '@solana/web3.js'
import { NextApiRequest, NextApiResponse } from 'next'
import handlerFundTransaction from '../pages/api/grant/v1/fund_transaction'
import {
  getAmountAndProofRoute,
  getFundTransactionRoute,
  handleAmountAndProofResponse,
  handleFundTransaction,
} from '../utils/api'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import handlerAmountAndProof from '../pages/api/grant/v1/amount_and_proof'

export class NextApiResponseMock {
  public jsonBody: any
  public statusCode: number = 0

  json(jsonBody: any) {
    this.jsonBody = jsonBody
  }

  status(statusCode: number): NextApiResponseMock {
    this.statusCode = statusCode
    return this
  }
}
export async function mockfetchFundTransaction(
  transactions: VersionedTransaction[]
): Promise<VersionedTransaction[]> {
  const req: NextApiRequest = {
    url: getFundTransactionRoute(),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: transactions.map((tx) => Buffer.from(tx.serialize())),
  } as unknown as NextApiRequest
  const res = new NextApiResponseMock()

  await handlerFundTransaction(req, res as unknown as NextApiResponse)
  return handleFundTransaction(res.statusCode, res.jsonBody)
}

/** fetchAmountAndProof but for tests */
export async function mockFetchAmountAndProof(
  ecosystem: Ecosystem,
  identity: string
): Promise<
  { claimInfo: ClaimInfo; proofOfInclusion: Uint8Array[] } | undefined
> {
  const req: NextApiRequest = {
    url: getAmountAndProofRoute(ecosystem, identity),
    query: { ecosystem, identity },
  } as unknown as NextApiRequest
  const res = new NextApiResponseMock()

  await handlerAmountAndProof(req, res as unknown as NextApiResponse)
  return handleAmountAndProofResponse(
    ecosystem,
    identity,
    res.statusCode,
    res.jsonBody
  )
}
