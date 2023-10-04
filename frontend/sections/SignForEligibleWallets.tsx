import React, { useEffect, useState } from 'react'

import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { Ecosystem } from '@components/Ecosystem'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { EcosystemSignButton } from '@components/EcosystemSignButton'
import { useTotalGrantedCoins } from 'hooks/useTotalGrantedCoins'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import { BackButton, ProceedButton } from '@components/buttons'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { TotalAllocationRow } from '@components/table/TotalAllocationRow'
import { SignAndClaimRowLayout } from '@components/table/SignAndClaimRowLayout'

export const SignForEligibleWallets = ({
  onBack,
  onProceed,
}: {
  onBack: () => void
  onProceed: () => void
}) => {
  const { activity } = useActivity()
  const totalGrantedCoins = useTotalGrantedCoins()
  const [isProceedDisabled, setIsProceedDisabled] = useState(true)
  const [proceedTooltipContent, setProceedTooltipContent] = useState<string>()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const { getSignature } = useSignature()
  const { getEligibility } = useEligibility()

  useEffect(() => {
    // If we are on this step, that means there is atleast one ecosystem
    // for which tokens can be claimed. Hence we will only check for signs
    // for active and connected ecosystems
    // for eligible and not yet claimed ecosystem
    // signed msgs should be there

    let isSignPending: boolean = false
    const solanaIdentity = getEcosystemIdentity(Ecosystem.SOLANA)
    Object.values(Ecosystem).forEach((ecosystem) => {
      if (activity[ecosystem] === false) return
      if (solanaIdentity === undefined) return

      const identity = getEcosystemIdentity(ecosystem)
      // identity shouldn't be undefined here
      // as this ecosystem is active and hence must be connected by the user
      // in previous steps
      if (identity === undefined) return

      // active and connected
      const eligibility = getEligibility(ecosystem)
      if (
        eligibility === undefined ||
        eligibility.isClaimAlreadySubmitted === true
      )
        return

      // now we have an ecosystem which is active, connected and has some tokens unclaimed
      const signature = getSignature(ecosystem)
      if (signature === undefined) {
        isSignPending = true
      }
    })

    if (isSignPending) {
      setIsProceedDisabled(true)
      setProceedTooltipContent('Please sign for all the eligible ecosystems.')
    } else {
      setIsProceedDisabled(false)
      setProceedTooltipContent(undefined)
    }
  }, [activity, getEcosystemIdentity, getEligibility, getSignature])

  return (
    <div className=" overflow-auto border border-light-35 bg-dark">
      <div className="min-w-[650px]">
        <div className="flex items-center justify-between border-b border-light-35 bg-[#242339] py-8 px-10">
          <h4 className="   font-header text-[28px] font-light leading-[1.2]">
            Verify Eligibility
          </h4>
          <div className="flex gap-4">
            <BackButton onBack={onBack} />
            <ProceedButton
              onProceed={onProceed}
              disabled={isProceedDisabled}
              tooltipContent={proceedTooltipContent}
            />
          </div>
        </div>

        <table className="">
          <tbody>
            {Object.values(Ecosystem).map((ecosystem) => (
              // <TableRow ecosystem={ecosystem} key={ecosystem} />
              <SignAndClaimRowLayout ecosystem={ecosystem} key={ecosystem}>
                <EcosystemSignButton ecosystem={ecosystem} />
              </SignAndClaimRowLayout>
            ))}
            <TotalAllocationRow totalGrantedCoins={totalGrantedCoins} />
          </tbody>
        </table>
      </div>
    </div>
  )
}
