import BN from 'bn.js'
import { ClaimInfo, Ecosystem } from '../claim_sdk/claim'
import { HASH_SIZE } from '../claim_sdk/merkleTree'
import { PublicKey } from '@solana/web3.js'
import { SignedMessage } from '../claim_sdk/ecosystems/signatures'

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
