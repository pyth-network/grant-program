import { useCallback } from 'react'
import { useGetEcosystemIdentity } from './useGetEcosystemIdentity'
import { Ecosystem } from '@components/Ecosystem'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import { useActivity } from '@components/Ecosystem/ActivityProvider'

// It returns a function which can be used to fetch an ecosystem claim info
// Note many ecosystem signatrues or eligibility might be stored locally
// But it will return for only those which are currently connected and active
export function useGetClaim() {
  const { activity } = useActivity()
  const { eligibility: eligibilityMap } = useEligibility()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const { signatureMap } = useSignature()

  return useCallback(
    (ecosystem: Ecosystem) => {
      if (activity[ecosystem] === false) return undefined

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
    [activity, eligibilityMap, getEcosystemIdentity, signatureMap]
  )
}
