import React, { useEffect, useMemo, useState } from 'react'

import Verified from '@images/verified.inline.svg'
import NotVerified from '@images/not.inline.svg'
import Tooltip from '@components/Tooltip'

import { classNames } from 'utils/classNames'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useCoins } from 'hooks/useCoins'
import { Ecosystem } from '@components/Ecosystem'
import { BackButton, ProceedButton } from '@components/buttons'
import { useTotalGrantedCoins } from 'hooks/useTotalGrantedCoins'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { EcosystemConnectButton } from '@components/EcosystemConnectButton'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { CoinCell } from '@components/table/CoinCell'
import { TotalAllocationRow } from '@components/table/TotalAllocationRow'
import { EcosystemRowLabel } from '@components/table/EcosystemRowLabel'
import { Box } from '@components/Box'

const Eligibility = ({
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
  const { getEligibility } = useEligibility()

  useEffect(() => {
    // we will check if the user has connected to all the ecosystem they have
    // selected as active
    // active + connected
    let isConnectionPending: boolean = false
    Object.values(Ecosystem).forEach((ecosystem) => {
      if (activity[ecosystem] === false) return
      else {
        const identity = getEcosystemIdentity(ecosystem)
        if (identity === undefined) isConnectionPending = true
      }
    })

    // We will also check if there are some tokens yet to claim
    let areAllTokensClaimed: boolean = true
    Object.values(Ecosystem).forEach((ecosystem) => {
      const eligibility = getEligibility(ecosystem)
      if (eligibility?.isClaimAlreadySubmitted === false) {
        areAllTokensClaimed = false
      }
    })

    // Proceed is disabled if a connection is pending or
    // if there is no tokens to claim
    if (isConnectionPending) {
      setIsProceedDisabled(true)
      setProceedTooltipContent('Some ecosystems are not yet connected.')
      return
    } else if (areAllTokensClaimed) {
      setIsProceedDisabled(true)
      setProceedTooltipContent('There are no tokens to claim.')
      return
    } else {
      setIsProceedDisabled(false)
      setProceedTooltipContent(undefined)
    }
  }, [activity, getEcosystemIdentity, getEligibility])

  return (
    <Box>
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
      <table>
        <tbody>
          {Object.values(Ecosystem).map((ecosystem) => (
            <TableRow ecosystem={ecosystem} key={ecosystem} />
          ))}
          <TotalAllocationRow totalGrantedCoins={totalGrantedCoins} />
        </tbody>
      </table>
    </Box>
  )
}

type TableRowProps = {
  ecosystem: Ecosystem
}
function TableRow({ ecosystem }: TableRowProps) {
  const { activity } = useActivity()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const getEligibleCoins = useCoins()
  const { getEligibility } = useEligibility()

  const eligibility = getEligibility(ecosystem)
  const isActive = activity[ecosystem]
  const rowDisabled = isActive === false

  const identity = getEcosystemIdentity(ecosystem)
  const eligibleCoins = getEligibleCoins(ecosystem)

  const [tooltipContent, tooltipIcon] = useMemo(() => {
    if (isActive === false) return [undefined, <Verified key={null} />]

    if (identity === undefined) {
      return [
        'Please connect the ecosystem to check for the granted Pyth tokens.',
        <NotVerified key={null} />,
      ]
    } else {
      if (eligibility?.claimInfo === undefined) {
        return [
          'This wallet is unfortunately not eligible for an allocation. You can click on the wallet address to disconnect and connect to another wallet.',
          <NotVerified key={null} />,
        ]
      } else {
        if (eligibility.isClaimAlreadySubmitted === true) {
          return [
            'The allocated tokens for this wallet have already been claimed. You can click on the wallet address to disconnect and connect to another wallet.',
            <NotVerified key={null} />,
          ]
        } else {
          return [
            'Congratulations! This wallet is successfully connected. Click on the wallet address to disconnect to connect to another wallet.',
            <Verified key={null} />,
          ]
        }
      }
    }
  }, [
    eligibility?.claimInfo,
    eligibility?.isClaimAlreadySubmitted,
    identity,
    isActive,
  ])

  return (
    <tr className={'border-b border-light-35 '}>
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
          <EcosystemRowLabel ecosystem={ecosystem} />
          <span className={'flex items-center gap-5'}>
            <EcosystemConnectButton ecosystem={ecosystem} />
            <Tooltip content={tooltipContent}>{tooltipIcon}</Tooltip>
          </span>
        </div>
      </td>
      <CoinCell
        coins={eligibleCoins}
        isStriked={eligibility?.isClaimAlreadySubmitted}
      />
    </tr>
  )
}

export default Eligibility
