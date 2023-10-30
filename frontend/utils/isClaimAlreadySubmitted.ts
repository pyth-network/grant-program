import { web3 } from '@coral-xyz/anchor'
import { ClaimInfo } from 'claim_sdk/claim'
import { MerkleTree } from 'claim_sdk/merkleTree'
import * as anchor from '@coral-xyz/anchor'

// isClaimAlreadySubmitted help us check if a claim has already been submitted or not.
export async function isClaimAlreadySubmitted(claimInfo: ClaimInfo) {
  const programId = new web3.PublicKey(process.env.PROGRAM_ID!)
  const connection = new anchor.web3.Connection(
    process.env.ENDPOINT!,
    anchor.AnchorProvider.defaultOptions()
  )
  return (
    (
      await connection.getAccountInfo(getReceiptPda(claimInfo, programId)[0])
    )?.owner.equals(programId) ?? false
  )
}

function getReceiptPda(
  claimInfo: ClaimInfo,
  programId: anchor.web3.PublicKey
): [anchor.web3.PublicKey, number] {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('receipt'), MerkleTree.hashLeaf(claimInfo.toBuffer())],
    programId
  )
}
