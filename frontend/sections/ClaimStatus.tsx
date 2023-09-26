import React, { useEffect, useMemo, useState } from 'react'
import Coin from '@images/coin.inline.svg'

import { classNames } from 'utils/classNames'
import { useCoins } from 'hooks/useCoins'
import { Ecosystem } from '@components/Ecosystem'
import { EcosystemClaimState } from './SignAndClaim'

import Loader from '@images/loader.inline.svg'
import Failed from '@images/not.inline.svg'
import Success from '@images/verified.inline.svg'
import { EcosystemConnectButton } from '@components/EcosystemConnectButton'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'
import Tooltip from '@components/Tooltip'
import { useTotalGrantedCoins } from 'hooks/useTotalGrantedCoins'
import { ProceedButton } from '@components/buttons'
import { Box } from '@components/Box'

export const ClaimStatus = ({
  onProceed,
  ecosystemsClaimState,
}: {
  onProceed: () => void
  // This will be defined if the claims were submitted
  ecosystemsClaimState: { [key in Ecosystem]?: EcosystemClaimState } | undefined
}) => {
  const totalGrantedCoins = useTotalGrantedCoins()
  const [isProceedDisabled, setIsProceedDisabled] = useState(true)
  const [proceedTooltipContent, setProceedTooltipContent] = useState<string>()

  // disable proceed
  useEffect(() => {
    if (ecosystemsClaimState !== undefined) {
      let isAnyProccessing = false
      // if a claim submission is still proceesing
      Object.values(ecosystemsClaimState).forEach((ecosystemClaimState) => {
        if (ecosystemClaimState.error === undefined) isAnyProccessing = true
      })

      if (isAnyProccessing) {
        setIsProceedDisabled(true)
        setProceedTooltipContent('proceesing')
      } else {
        setIsProceedDisabled(false)
        setProceedTooltipContent(undefined)
      }
    }
  }, [ecosystemsClaimState])

  return (
    <Box>
      <div className="min-w-[650px]">
        <div className="flex items-center justify-between border-b border-light-35 bg-[#242339] py-8 px-10">
          <h4 className="   font-header text-[28px] font-light leading-[1.2]">
            Verify Eligibility
          </h4>
          <div className="flex gap-4">
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
    </Box>
  )
}

type TableRowProps = {
  ecosystem: Ecosystem
  ecosystemClaimState: EcosystemClaimState | undefined
}
function TableRow({ ecosystem, ecosystemClaimState }: TableRowProps) {
  const getEligibleCoins = useCoins()
  const [rowDisabled, setRowDisabled] = useState(true)

  useEffect(() => {
    // Row is disabled if ecosystemClaimState is undefined
    if (ecosystemClaimState === undefined) {
      setRowDisabled(true)
    } else {
      setRowDisabled(false)
    }
  }, [ecosystemClaimState])

  // Showing coins only for ecosytem for which we submitted a claim.
  const coins = useMemo(() => {
    if (ecosystemClaimState === undefined) return 'N/A'
    return getEligibleCoins(ecosystem)
  }, [ecosystem, ecosystemClaimState, getEligibleCoins])

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
            {ecosystemClaimState !== undefined && (
              <ClaimState ecosystemClaimState={ecosystemClaimState} />
            )}
          </span>
        </div>
      </td>
      <td className="min-w-[130px] border-l border-light-35 bg-darkGray5">
        <span className="flex items-center justify-center  gap-1 text-[20px]">
          {coins}
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
  const { error } = ecosystemClaimState

  const text = useMemo(() => {
    if (error === undefined) return 'claiming...'
    if (error === null) return 'claimed'
    if (error) return 'failed'
  }, [error])

  const icon = useMemo(() => {
    if (error === undefined) return <Loader />
    if (error === null) return <Success />
    if (error) return <Failed />
  }, [error])

  return (
    <div className="flex items-center justify-between gap-4 text-base18">
      {text}
      {icon}
    </div>
  )
}
