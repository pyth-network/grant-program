import { useCallback } from 'react'
import { useGetEcosystemIdentity } from './useGetEcosystemIdentity'
import { Ecosystem } from '@components/Ecosystem'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useSignature } from '@components/Ecosystem/SignatureProvider'

// It returns a function which can be used to fetch an ecosystem claim info
export function useGetClaim() {
  const { eligibility: eligibilityMap } = useEligibility()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const { signatureMap } = useSignature()

  return useCallback(
    (ecosystem: Ecosystem) => {
      const solanaIdentity = getEcosystemIdentity(Ecosystem.SOLANA)
      const ecosystemIdentity = getEcosystemIdentity(ecosystem)

      if (solanaIdentity === undefined || ecosystemIdentity === undefined)
        return undefined

      const eligibility = eligibilityMap[ecosystem]?.[ecosystemIdentity]
      const signature =
        signatureMap[solanaIdentity]?.[ecosystem]?.[ecosystemIdentity]

      if (eligibility === undefined || signature === undefined) return undefined

      return {
        signedMessage: signature,
        claimInfo: eligibility.claimInfo,
        proofOfInclusion: eligibility.proofOfInclusion,
      }
    },
    [eligibilityMap, getEcosystemIdentity, signatureMap]
  )
}
