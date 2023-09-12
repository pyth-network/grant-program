import { Ecosystem } from '@components/Ecosystem'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useCallback } from 'react'

// useCoins return a function which can read the granted amount
// from the eligiblityMap stored in the global context
// The returned function returns the amount in string if available
// Else undefined
export function useCoins() {
  const { eligibility } = useEligibility()

  return useCallback(
    (ecosystem: Ecosystem, identity: string | undefined | null) => {
      if (identity === undefined || identity === null) return undefined
      else return eligibility[ecosystem][identity]?.claimInfo.amount.toString()
    },
    [eligibility]
  )
}
