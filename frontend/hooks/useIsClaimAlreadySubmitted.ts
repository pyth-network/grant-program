import { web3 } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Keypair } from '@solana/web3.js'
import { ClaimInfo } from 'claim_sdk/claim'
import { TokenDispenserProvider } from 'claim_sdk/solana'
import { useCallback } from 'react'

// useIsClaimAlreadySubmitted returns a method to help us check if a claim has already been
// submitted or not.
// NOTE: it is using the TokenDispenserProvider internally but with a randomly generated
// keypair. Since, we don't need a specific one to check for claims.
export function useIsClaimAlreadySubmitted() {
  return useCallback((claimInfo: ClaimInfo) => {
    const tokenDispenser = new TokenDispenserProvider(
      process.env.ENDPOINT!,
      new NodeWallet(new Keypair()),
      new web3.PublicKey(process.env.PROGRAM_ID!)
    )

    return tokenDispenser.isClaimAlreadySubmitted(claimInfo)
  }, [])
}
