import React, { useEffect, useMemo, useState } from 'react'
import Coin from '@images/coin.inline.svg'

import TooltipIcon from '@images/tooltip.inline.svg'
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
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'

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
      setProceedTooltipContent('Some ecosystem are not yet connected.')
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
    <div className=" border border-light-35 bg-dark">
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
          <tr className="border-b border-light-35 ">
            <td className="w-full bg-darkGray5 py-2 pl-10 pr-4">
              <div className="flex items-center justify-between">
                <span className="font-header text-base18 font-semibold">
                  Eligible Token Allocation
                </span>
              </div>
            </td>
            <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
              <span className=" flex min-h-[60px]  items-center justify-center gap-1 text-[20px] font-semibold">
                {totalGrantedCoins} <Coin />{' '}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
  const [rowDisabled, setRowDisabled] = useState(true)
  // if it is undefined, no tooltip will be shown
  const [rowTooltipContent, setRowTooltipContent] = useState<string>()

  const eligibility = getEligibility(ecosystem)
  const isActive = activity[ecosystem]

  useEffect(() => {
    ;(async () => {
      // Row is disabled when
      // The ecosystem is inactive
      if (isActive === false) {
        setRowDisabled(true)
        return
      }

      if (isActive === true) {
        if (eligibility?.claimInfo !== undefined) {
          if (eligibility?.isClaimAlreadySubmitted === true) {
            setRowTooltipContent(
              'The tokens for this ecosystem has already been claimed.'
            )
          }
        } else {
          setRowTooltipContent(
            'There are no tokens to claim for this ecosystem.'
          )
        }
      }

      setRowDisabled(false)
    })()
  }, [
    ecosystem,
    eligibility?.claimInfo,
    eligibility?.isClaimAlreadySubmitted,
    getEcosystemIdentity,
    getEligibility,
    isActive,
  ])

  const identity = getEcosystemIdentity(ecosystem)
  const eligibleCoins = getEligibleCoins(ecosystem)

  const tooltipContent = useMemo(() => {
    if (identity !== undefined)
      return 'Congratulations! This ecosystem is successfully connected. Click on the button to disconnect.'
    else
      return 'Please connect the ecosystem to check for the granted Pyth tokens.'
  }, [identity])

  const icon = useMemo(() => {
    if (isActive && identity !== undefined) return <Verified />
    else return <NotVerified />
  }, [identity, isActive])

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
          <span className="font-header text-base18 font-thin">
            {getEcosystemTableLabel(ecosystem)}
          </span>
          <span className={'flex items-center gap-5'}>
            <EcosystemConnectButton ecosystem={ecosystem} />
            <Tooltip content={tooltipContent}>
              <TooltipIcon />
            </Tooltip>
            {icon}
          </span>
        </div>
      </td>
      <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
        <Tooltip content={rowTooltipContent} placement={'right'}>
          <span className="flex items-center justify-center  gap-1 text-[20px]">
            {eligibility?.isClaimAlreadySubmitted ? (
              <s>{eligibleCoins}</s>
            ) : (
              <>{eligibleCoins}</>
            )}{' '}
            <Coin />
          </span>
        </Tooltip>
      </td>
    </tr>
  )
}

export default Eligibility
