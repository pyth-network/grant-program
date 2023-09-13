import { Ecosystem } from '@components/Ecosystem'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useCallback } from 'react'
import { useGetEcosystemIdentity } from './useGetEcosystemIdentity'
import { useActivity } from '@components/Ecosystem/ActivityProvider'

// useGetEligibility returns a function which can read the stored eligibility from the eligiblityMap
// It will return undefined if it can't find one stored
// We are only working with  active ecosystem
// Hence, if an ecosystem is isActive it won't return claim info for that
export function useGetEligibility() {
  const { activity } = useActivity()
  const { eligibility } = useEligibility()
  const getEcosystemIdentity = useGetEcosystemIdentity()

  return useCallback(
    (ecosystem: Ecosystem) => {
      if (activity[ecosystem] === false) return undefined
      const identity = getEcosystemIdentity(ecosystem)
      if (identity === undefined) return undefined
      return eligibility[ecosystem][identity]
    },
    [activity, eligibility, getEcosystemIdentity]
  )
}
