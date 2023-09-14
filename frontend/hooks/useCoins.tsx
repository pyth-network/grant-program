import { Ecosystem } from '@components/Ecosystem'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useCallback } from 'react'
import { useActivity } from '@components/Ecosystem/ActivityProvider'

// useCoins return a function which can read the granted amount from the eligiblityMap
// stored in the global context
// For given ecosystem, we will first check if the user has selected active or not.
// If not, returns 'N/A'. Else
// If the wallet is not eligible, returns '0'
// Else, it will return the amount if it is stored
export function useCoins() {
  const { activity } = useActivity()
  const { getEligibility } = useEligibility()

  return useCallback(
    (ecosystem: Ecosystem) => {
      if (activity[ecosystem] === false) return 'N/A'

      const eligibility = getEligibility(ecosystem)
      if (eligibility === undefined) return '0'

      return eligibility.claimInfo.amount.toString()
    },
    [activity, getEligibility]
  )
}
