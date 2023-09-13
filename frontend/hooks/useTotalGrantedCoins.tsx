import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useMemo } from 'react'
import { useGetEcosystemIdentity } from './useGetEcosystemIdentity'
import { Ecosystem } from '@components/Ecosystem'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { BN } from '@coral-xyz/anchor'

// useTotalGrantedCoins returns the total granted coins
// It includes only those ecosystem which the user has selected as active
// and which are connected to the website.
export function useTotalGrantedCoins() {
  const { activity } = useActivity()
  const { eligibility } = useEligibility()
  const getEcosystemIdentity = useGetEcosystemIdentity()

  return useMemo(() => {
    let totalAmount = new BN(0)
    Object.values(Ecosystem).forEach((ecosystem) => {
      // User may have connected a wallet and then set it to inactive
      // Add for only those ecosystem which are active
      if (activity[ecosystem] === false) return

      // Get the currently connected identity
      const ecosystemIdentity = getEcosystemIdentity(ecosystem)
      if (ecosystemIdentity === undefined) return
      const amount = eligibility[ecosystem][ecosystemIdentity]?.claimInfo.amount

      if (amount !== undefined) totalAmount = totalAmount.add(amount)
    })

    return totalAmount.toString()
  }, [activity, eligibility, getEcosystemIdentity])
}
