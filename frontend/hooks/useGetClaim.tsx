import { useCallback } from 'react'
import { Ecosystem } from '@components/Ecosystem'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useSignature } from '@components/Ecosystem/SignatureProvider'

// It returns a function which can be used to fetch an ecosystem claim info
// Note many ecosystem signatrues or eligibility might be stored locally
// But it will return for only those which are currently connected and active
export function useGetClaim() {
  const { getEligibility } = useEligibility()
  const { getSignature } = useSignature()

  return useCallback(
    (ecosystem: Ecosystem) => {
      const eligibility = getEligibility(ecosystem)
      const signature = getSignature(ecosystem)

      if (
        eligibility === undefined ||
        (signature === undefined && ecosystem !== Ecosystem.SOLANA)
      )
        return undefined
      if (eligibility.isClaimAlreadySubmitted === true) return undefined

      return {
        signedMessage: signature,
        claimInfo: eligibility.claimInfo,
        proofOfInclusion: eligibility.proofOfInclusion,
      }
    },
    [getEligibility, getSignature]
  )
}
