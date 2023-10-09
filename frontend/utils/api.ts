import BN from 'bn.js'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import { HASH_SIZE } from '../claim_sdk/merkleTree'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import { SignedMessage } from '../claim_sdk/ecosystems/signatures'
import { EvmChains, SOLANA_SOURCES } from './db'

function parseProof(proof: string) {
  const buffer = Buffer.from(proof, 'hex')
  const chunks = []

  if (buffer.length % HASH_SIZE !== 0) {
    throw new Error('Proof of inclusion must be a multiple of 32 bytes')
  }

  for (let i = 0; i < buffer.length; i += HASH_SIZE) {
    const chunk = Uint8Array.prototype.slice.call(buffer, i, i + HASH_SIZE)
    chunks.push(chunk)
  }
  return chunks
}

export function getAmountAndProofRoute(
  ecosystem: Ecosystem,
  identity: string
): string {
  return `/api/grant/v1/amount_and_proof?ecosystem=${ecosystem}&identity=${identity}`
}

export function handleAmountAndProofResponse(
  ecosystem: Ecosystem,
  identity: string,
  status: number,
  data: any
): { claimInfo: ClaimInfo; proofOfInclusion: Uint8Array[] } | undefined {
  if (status == 404) return undefined
  if (status == 200) {
    return {
      claimInfo: new ClaimInfo(ecosystem, identity, new BN(data.amount)),
      proofOfInclusion: parseProof(data.proof),
    }
  }
}

// If the given identity is not eligible the value will be undefined
// Else the value contains the eligibility information
export type Eligibility =
  | { claimInfo: ClaimInfo; proofOfInclusion: Uint8Array[] }
  | undefined
export async function fetchAmountAndProof(
  ecosystem: Ecosystem,
  identity: string
): Promise<Eligibility> {
  const response = await fetch(getAmountAndProofRoute(ecosystem, identity))
  return handleAmountAndProofResponse(
    ecosystem,
    identity,
    response.status,
    await response.json()
  )
}

export function getDiscordSignedMessageRoute(claimant: PublicKey) {
  return `/api/grant/v1/discord_signed_message?publicKey=${claimant.toBase58()}`
}

export function handleDiscordSignedMessageResponse(
  status: number,
  data: any
): SignedMessage | undefined {
  if (status == 200) {
    return {
      signature: Buffer.from(data.signature, 'hex'),
      publicKey: Buffer.from(data.publicKey, 'hex'),
      fullMessage: Buffer.from(data.fullMessage, 'hex'),
      recoveryId: undefined,
    }
  }
}

export async function fetchDiscordSignedMessage(
  claimant: PublicKey
): Promise<SignedMessage | undefined> {
  const response = await fetch(getDiscordSignedMessageRoute(claimant))
  return handleDiscordSignedMessageResponse(
    response.status,
    await response.json()
  )
}

export type EvmChainAllocation = { chain: EvmChains; amount: BN }

export function getEvmBreakdownRoute(identity: string): string {
  return `/api/grant/v1/evm_breakdown?identity=${identity}`
}

export function handleEvmBreakdown(
  status: number,
  data: any
): EvmChainAllocation[] | undefined {
  if (status == 404) return undefined
  if (status == 200) {
    return data.map((row: any) => {
      return {
        chain: row.chain,
        amount: new BN(row.amount),
      }
    })
  }
}

export async function fetchEvmBreakdown(
  identity: string
): Promise<EvmChainAllocation[] | undefined> {
  const response = await fetch(getEvmBreakdownRoute(identity))
  return handleEvmBreakdown(response.status, await response.json())
}

export type SolanaBreakdown = { source: SOLANA_SOURCES; amount: BN }

export function getSolanaBreakdownRoute(identity: string): string {
  return `/api/grant/v1/solana_breakdown?identity=${identity}`
}

export function handleSolanaBreakdown(
  status: number,
  data: any
): SolanaBreakdown[] | undefined {
  if (status == 404) return undefined
  if (status == 200) {
    return data.map((row: any) => {
      return {
        source: row.source,
        amount: new BN(row.amount),
      }
    })
  }
}

export async function fetchSolanaBreakdown(
  identity: string
): Promise<SolanaBreakdown[] | undefined> {
  const response = await fetch(getSolanaBreakdownRoute(identity))
  return handleSolanaBreakdown(response.status, await response.json())
}

export function getFundTransactionRoute(): string {
  return `/api/grant/v1/fund_transaction`
}

export function handleFundTransaction(
  status: number,
  data: any
): VersionedTransaction[] {
  if (status == 200) {
    return data.map((serializedTx: any) => {
      return VersionedTransaction.deserialize(Buffer.from(serializedTx))
    })
  } else {
    throw new Error(data.error)
  }
}

export async function fetchFundTransaction(
  transactions: VersionedTransaction[]
): Promise<VersionedTransaction[]> {
  const response = await fetch(getFundTransactionRoute(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transactions.map((tx) => Buffer.from(tx.serialize()))),
  })

  return handleFundTransaction(response.status, await response.json())
}
