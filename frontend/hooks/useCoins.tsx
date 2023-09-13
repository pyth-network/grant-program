import { Ecosystem } from '@components/Ecosystem'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useCallback } from 'react'
import { useGetEcosystemIdentity } from './useGetEcosystemIdentity'
import { useActivity } from '@components/Ecosystem/ActivityProvider'

// useCoins return a function which can read the granted amount from the eligiblityMap
// stored in the global context
// For given ecosystem, we will first check if the user has selected active or not.
// If not, returns 'N/A'. Else
// If the wallet is not connected, returns 'N/A'
// If it is connected, it will return the amount if it is stored
// Else it will return 0
export function useCoins() {
  const { activity } = useActivity()
  const { eligibility } = useEligibility()
  const getEcosystemIdentity = useGetEcosystemIdentity()

  return useCallback(
    (ecosystem: Ecosystem) => {
      if (activity[ecosystem] === false) return 'N/A'
      const identity = getEcosystemIdentity(ecosystem)
      if (identity === undefined || identity === null) return 'N/A'
      else {
        const coins =
          eligibility[ecosystem][identity]?.claimInfo.amount.toString()
        if (coins === undefined) return '0'
        else return coins
      }
    },
    [activity, eligibility, getEcosystemIdentity]
  )
}
