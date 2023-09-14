import { useMemo } from 'react'
import { Ecosystem } from '@components/Ecosystem'
import { BN } from '@coral-xyz/anchor'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { toStringWithDecimals } from 'utils/toStringWithDecimals'

// useTotalGrantedCoins returns the total granted coins
// It includes only those ecosystem which the user has selected as active
// which are connected to the website and which has tokens yet to be claimed
export function useTotalGrantedCoins() {
  const { getEligibility } = useEligibility()

  return useMemo(() => {
    let totalAmount = new BN(0)
    Object.values(Ecosystem).forEach((ecosystem) => {
      const eligibility = getEligibility(ecosystem)
      if (eligibility === undefined || eligibility.isClaimAlreadySubmitted)
        return

      const amount = eligibility.claimInfo.amount
      if (amount !== undefined) totalAmount = totalAmount.add(amount)
    })

    return toStringWithDecimals(totalAmount)
  }, [getEligibility])
}
