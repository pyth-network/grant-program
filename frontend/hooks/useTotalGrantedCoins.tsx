import { useMemo } from 'react'
import { Ecosystem } from '@components/Ecosystem'
import { BN } from '@coral-xyz/anchor'
import { useGetEligibility } from './useGetEligibility'

// useTotalGrantedCoins returns the total granted coins
// It includes only those ecosystem which the user has selected as active
// and which are connected to the website.
export function useTotalGrantedCoins() {
  const getEligibility = useGetEligibility()

  return useMemo(() => {
    let totalAmount = new BN(0)
    Object.values(Ecosystem).forEach((ecosystem) => {
      const eligibility = getEligibility(ecosystem)
      if (eligibility === undefined || eligibility.isClaimAlreadySubmitted)
        return

      const amount = eligibility.claimInfo.amount
      if (amount !== undefined) totalAmount = totalAmount.add(amount)
    })

    return totalAmount.toString()
  }, [getEligibility])
}
