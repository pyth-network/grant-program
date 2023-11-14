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
import { Box } from '@components/Box'
import { useDiscordSignMessage } from 'hooks/useDiscordSignMessage'

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

  // It is a side effect that runs when the component mounts.
  // It auto fetches a signed message to be submit with others.
  // It also checks for the eligibility
  useDiscordSignMessage()

  useEffect(() => {
    // If we are on this step, that means there is atleast one ecosystem
    // for which tokens can be claimed. Hence we will only check for signs
    // for active and connected ecosystems
    // for eligible and not yet claimed ecosystem
    // signed msgs should be there

    let isSignPending: boolean = false
    const solanaIdentity = getEcosystemIdentity(Ecosystem.SOLANA)
    Object.values(Ecosystem).forEach((ecosystem) => {
      // We don't need to get a signed message from Solana.
      if (ecosystem === Ecosystem.SOLANA) return

      if (!activity[ecosystem]) return
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

  const isMobile = window.innerWidth < 480

  return (
    <Box>
      <div className="flex items-center justify-between border-b border-light-35 bg-[#242339] py-4 px-4 sm:py-8 sm:px-10">
        <h4 className="font-header text-[20px] font-light leading-[1.2] sm:text-[28px]">
          Sign Your Wallets and Claim
        </h4>
        <div className="flex gap-1 sm:gap-4">
          <BackButton onBack={onBack} hideText={isMobile} />
          <ProceedButton
            onProceed={onProceed}
            disabled={isProceedDisabled}
            tooltipContent={proceedTooltipContent}
            hideText={isMobile}
          />
        </div>
      </div>

      <table className="">
        <tbody>
          {Object.values(Ecosystem).map((ecosystem) => {
            if (
              ecosystem === Ecosystem.DISCORD ||
              ecosystem === Ecosystem.SOLANA
            )
              return (
                <SignAndClaimRowLayout ecosystem={ecosystem} key={ecosystem} />
              )
            return (
              <SignAndClaimRowLayout ecosystem={ecosystem} key={ecosystem}>
                <EcosystemSignButton ecosystem={ecosystem} />
              </SignAndClaimRowLayout>
            )
          })}
          <TotalAllocationRow totalGrantedCoins={totalGrantedCoins} />
        </tbody>
      </table>
    </Box>
  )
}
