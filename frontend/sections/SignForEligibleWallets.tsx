import React, { useEffect, useMemo, useState } from 'react'
import Arrow from '@images/arrow.inline.svg'
import Coin from '@images/coin.inline.svg'

import { classNames } from 'utils/classNames'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useCoins } from 'hooks/useCoins'
import { Ecosystem } from '@components/Ecosystem'
import { EcosystemClaimState } from './SignAndClaim'

import Loader from '@images/loader.inline.svg'
import Failed from '@images/not.inline.svg'
import Success from '@images/verified.inline.svg'
import { EcosystemConnectButton } from '@components/EcosystemConnectButton'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useGetEligibility } from 'hooks/useGetEligibility'
import { useIsClaimAlreadySubmitted } from 'hooks/useIsClaimAlreadySubmitted'
import Tooltip from '@components/Tooltip'
import { EcosystemSignButton } from '@components/EcosystemSignButton'
import { useTotalGrantedCoins } from 'hooks/useTotalGrantedCoins'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import { BackButton, ProceedButton } from '@components/buttons'

const Eligibility2 = ({
  onBack,
  onProceed,
  ecosystemsClaimState,
}: {
  onBack: () => void
  onProceed: () => void
  // this will not be undefined only when some claim is in progress
  ecosystemsClaimState: { [key in Ecosystem]?: EcosystemClaimState } | undefined
}) => {
  const { activity } = useActivity()
  const totalGrantedCoins = useTotalGrantedCoins()
  const [isProceedDisabled, setIsProceedDisabled] = useState(true)
  const [proceedTooltipContent, setProceedTooltipContent] = useState<string>()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const { eligibility } = useEligibility()
  const { signatureMap } = useSignature()
  const getEligibility = useGetEligibility()

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
      const signature = signatureMap[solanaIdentity]?.[ecosystem]?.[identity]
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
  }, [
    activity,
    eligibility,
    getEcosystemIdentity,
    getEligibility,
    signatureMap,
  ])

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
              <TableRow
                ecosystem={ecosystem}
                ecosystemClaimState={ecosystemsClaimState?.[ecosystem]}
                key={ecosystem}
              />
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
    </div>
  )
}

type TableRowProps = {
  ecosystem: Ecosystem
  ecosystemClaimState: EcosystemClaimState | undefined
}
function TableRow({ ecosystem, ecosystemClaimState }: TableRowProps) {
  const getEligibleCoins = useCoins()
  const { activity } = useActivity()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const getEligibility = useGetEligibility()
  const isClaimAlreadySubmitted = useIsClaimAlreadySubmitted()
  const [rowDisabled, setRowDisabled] = useState(true)
  // if it is undefined, no tooltip will be shown
  const [rowTooltipContent, setRowTooltipContent] = useState<string>()

  useEffect(() => {
    ;(async () => {
      // Row is disabled when
      // - Ecosystem is inactive or
      // - Ecosystem is active but
      // - - No Claim Info found or
      // - - Claim already submitted

      // Rows is enabled if
      // - Ecosystem is active and
      // - Ecosystem has a claim info and
      // - Claim has not been submitted

      const isActive = activity[ecosystem]
      // (NOTE: ecosystem will have a claim info only if the connected identity has a claim info)
      const eligibility = getEligibility(ecosystem)
      if (isActive === true) {
        if (eligibility?.claimInfo !== undefined) {
          if (eligibility?.isClaimAlreadySubmitted) {
            setRowDisabled(true)
            setRowTooltipContent(
              'The tokens for this ecosystem has already been claimed.'
            )
          } else {
            setRowDisabled(false)
            setRowTooltipContent(undefined)
          }
        } else {
          setRowDisabled(true)
          setRowTooltipContent(
            'There are no tokens to claim for this ecosystem.'
          )
        }
      } else setRowDisabled(true)
    })()
  }, [
    activity,
    ecosystem,
    getEcosystemIdentity,
    getEligibility,
    isClaimAlreadySubmitted,
  ])

  const eligibility = getEligibility(ecosystem)
  const eligibleCoins = getEligibleCoins(ecosystem)

  return (
    <tr className={classNames('border-b border-light-35 ')}>
      <td
        className={classNames(
          'w-full py-2 pl-10 pr-4',
          rowDisabled ? 'opacity-25' : ''
        )}
      >
        <Tooltip content={rowTooltipContent} placement={'right'}>
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
              {ecosystemClaimState === undefined ? (
                <EcosystemSignButton ecosystem={ecosystem} />
              ) : (
                <ClaimState ecosystemClaimState={ecosystemClaimState} />
              )}
            </span>
          </div>
        </Tooltip>
      </td>
      <td className="min-w-[130px] border-l border-light-35 bg-darkGray5">
        <span className="flex items-center justify-center  gap-1 text-[20px]">
          {eligibility?.isClaimAlreadySubmitted ? (
            <s>{eligibleCoins}</s>
          ) : (
            <>{eligibleCoins}</>
          )}{' '}
          <Coin />
        </span>
      </td>
    </tr>
  )
}

function ClaimState({
  ecosystemClaimState,
}: {
  ecosystemClaimState: EcosystemClaimState
}) {
  const { transactionSignature, loading, error } = ecosystemClaimState

  const text = useMemo(() => {
    if (loading === true) return 'claiming...'
    if (transactionSignature !== undefined && transactionSignature !== null)
      return 'claimed'
    if (error !== undefined && error !== null) return 'failed'
  }, [error, loading, transactionSignature])

  const icon = useMemo(() => {
    if (loading === true) return <Loader />
    if (transactionSignature !== undefined && transactionSignature !== null)
      return <Success />
    if (error !== undefined && error !== null) return <Failed />
  }, [error, loading, transactionSignature])

  return (
    <div className="flex items-center justify-between gap-4 text-base18">
      {text}
      {icon}
    </div>
  )
}

export default Eligibility2
