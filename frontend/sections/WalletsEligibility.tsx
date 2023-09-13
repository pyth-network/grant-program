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
  const getEcosystemIdentity = useGetEcosystemIdentity()
  useEffect(() => {
    // we will check if the user has connected to all the ecosystem they have
    // selected as active
    // active + connected
    let isConnectionPending: boolean = false
    Object.values(Ecosystem).forEach((ecosystem) => {
      if (activity[ecosystem] === false) return
      else {
        if (getEcosystemIdentity(ecosystem) === undefined)
          isConnectionPending = true
      }
    })

    if (isConnectionPending) setIsProceedDisabled(true)
    else setIsProceedDisabled(false)
  }, [activity, getEcosystemIdentity])

  return (
    <div className=" border border-light-35 bg-dark">
      <div className="flex items-center justify-between border-b border-light-35 bg-[#242339] py-8 px-10">
        <h4 className="   font-header text-[28px] font-light leading-[1.2]">
          Verify Eligibility
        </h4>
        <div className="flex gap-4">
          <BackButton onBack={onBack} />
          <ProceedButton onProceed={onProceed} disabled={isProceedDisabled} />
        </div>
      </div>
      <table>
        <tbody>
          <TableRow ecosystem={Ecosystem.SOLANA} />
          <TableRow ecosystem={Ecosystem.EVM} />
          <TableRow ecosystem={Ecosystem.APTOS} />
          <TableRow ecosystem={Ecosystem.SUI} />
          <TableRow ecosystem={Ecosystem.INJECTIVE} />
          <TableRow ecosystem={Ecosystem.OSMOSIS} />
          <TableRow ecosystem={Ecosystem.NEUTRON} />
          <TableRow ecosystem={Ecosystem.DISCORD} />
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

  const isActive = activity[ecosystem]
  const identity = getEcosystemIdentity(ecosystem)

  const tooltipContent = useMemo(() => {
    if (identity !== undefined)
      return 'Congratulations! This wallet is successfully connected. Click on the wallet address to disconnect.'
    else
      return 'Please connect the wallet to check for the granted Pyth tokens.'
  }, [identity])

  const icon = useMemo(() => {
    if (isActive && identity !== undefined) return <Verified />
    else return <NotVerified />
  }, [identity, isActive])

  return (
    <tr
      className={classNames(
        'border-b border-light-35 ',
        isActive ? '' : 'disabled'
      )}
    >
      <td className="w-full py-2 pl-10 pr-4">
        <div className="flex items-center justify-between">
          <span className="font-header text-base18 font-thin">
            {getEcosystemTableLabel(ecosystem)}
          </span>
          <span className="flex items-center gap-5">
            <EcosystemConnectButton ecosystem={ecosystem} />
            <Tooltip content={tooltipContent}>
              <TooltipIcon />
            </Tooltip>
            {icon}
          </span>
        </div>
      </td>
      <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
        <span className="flex items-center justify-center  gap-1 text-[20px]">
          {getEligibleCoins(ecosystem)} <Coin />
        </span>
      </td>
    </tr>
  )
}

export default Eligibility
