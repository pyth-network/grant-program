import React, { useEffect, useMemo, useState } from 'react'

import { classNames } from 'utils/classNames'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useCoins } from 'hooks/useCoins'
import { Ecosystem } from '@components/Ecosystem'
import { EcosystemConnectButton } from '@components/EcosystemConnectButton'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { EcosystemSignButton } from '@components/EcosystemSignButton'
import { useTotalGrantedCoins } from 'hooks/useTotalGrantedCoins'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import { BackButton, ProceedButton } from '@components/buttons'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { CoinCell } from '@components/table/CoinCell'
import { TotalAllocationRow } from '@components/table/TotalAllocationRow'
import { useSignAndClaimRowState } from 'hooks/useSignAndClaimRowState'

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
              <TableRow ecosystem={ecosystem} key={ecosystem} />
            ))}
            <TotalAllocationRow totalGrantedCoins={totalGrantedCoins} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

type TableRowProps = {
  ecosystem: Ecosystem
}
function TableRow({ ecosystem }: TableRowProps) {
  const getEligibleCoins = useCoins()
  const { getEligibility } = useEligibility()

  const eligibility = getEligibility(ecosystem)
  const eligibleCoins = getEligibleCoins(ecosystem)

  const { disabled: rowDisabled, tooltipContent: rowTooltipContent } =
    useSignAndClaimRowState(ecosystem)

  return (
    <tr className={classNames('border-b border-light-35 ')}>
      <td
        className={classNames(
          'w-full py-2 pl-10 pr-4',
          rowDisabled ? 'opacity-25' : ''
        )}
      >
        <div
          className={classNames(
            'flex items-center justify-between',
            rowDisabled ? 'pointer-events-none' : ''
          )}
        >
          <span className="min-w-[150px] font-header text-base18 font-thin">
            {getEcosystemTableLabel(ecosystem)}
          </span>

          <span className="flex flex-1  items-center justify-between gap-5">
            <EcosystemConnectButton
              ecosystem={ecosystem}
              disableOnConnect={true}
            />
            <EcosystemSignButton ecosystem={ecosystem} />
          </span>
        </div>
      </td>
      <CoinCell
        coins={eligibleCoins}
        isStriked={eligibility?.isClaimAlreadySubmitted}
        rowTooltipContent={rowTooltipContent}
      />
    </tr>
  )
}
