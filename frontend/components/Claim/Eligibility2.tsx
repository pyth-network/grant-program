import React, { ReactElement, useCallback, useMemo, useState } from 'react'
import Arrow from '../../images/arrow.inline.svg'
import Coin from '../../images/coin.inline.svg'

import TooltipIcon from '../../images/tooltip.inline.svg'
import Verified from '../../images/verified.inline.svg'
import Discord from '../../images/discord.inline.svg'
import Signed from '../../images/signed.inline.svg'

import { AptosSignButton, AptosWalletButton } from '@components/wallets/Aptos'
import { SuiSignButton, SuiWalletButton } from '@components/wallets/Sui'
import { EVMSignButton, EVMWalletButton } from '@components/wallets/EVM'
import {
  CosmosSignButton,
  CosmosWalletButton,
} from '@components/wallets/Cosmos'
import {
  SolanaSignButton,
  SolanaWalletButton,
} from '@components/wallets/Solana'
import { Ecosystem, useEcosystem } from '@components/EcosystemProvider'
import { classNames } from 'utils/classNames'
import { DiscordButton } from '@components/DiscordButton'
import { DiscordSignButton } from '@components/DiscordSignButton'

const Eligibility2 = ({
  onBack,
  onProceed,
}: {
  onBack: Function
  onProceed: Function
}) => {
  const { map: ecosystemMap } = useEcosystem()

  const isEligible = useCallback(
    (ecosystem: Ecosystem) => {
      const { isActive, eligibility } = ecosystemMap[ecosystem]
      return (
        isActive &&
        eligibility !== undefined &&
        eligibility.claimInfo.amount.gtn(0)
      )
    },
    [ecosystemMap]
  )
  return (
    <div className=" overflow-auto border border-light-35 bg-dark">
      <div className="min-w-[650px]">
        <div className="flex items-center justify-between border-b border-light-35 bg-[#242339] py-8 px-10">
          <h4 className="   font-header text-[28px] font-light leading-[1.2]">
            Verify Eligibility
          </h4>
          <div className="flex gap-4">
            <button
              className="btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light"
              onClick={() => onBack()}
            >
              <span className="relative inline-flex items-center whitespace-nowrap">
                <Arrow className="mr-2.5 origin-center rotate-180" />
                back
              </span>
            </button>
            <button
              className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
              onClick={() => onProceed()}
            >
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                proceed
                <Arrow />
              </span>
            </button>
          </div>
        </div>

        <table className="">
          <tbody>
            <TableRow
              label={'Solana Activity'}
              walletButton={<SolanaWalletButton disableOnConnect />}
              signButton={<SolanaSignButton />}
              coins={ecosystemMap.Solana.eligibility?.claimInfo.amount.toString()}
              isEligible={isEligible(Ecosystem.SOLANA)}
            />
            <TableRow
              label={'EVM Activity'}
              walletButton={<EVMWalletButton disableOnConnect />}
              signButton={<EVMSignButton />}
              coins={ecosystemMap.Evm.eligibility?.claimInfo.amount.toString()}
              isEligible={isEligible(Ecosystem.EVM)}
            />
            <TableRow
              label={'Aptos Activity'}
              walletButton={<AptosWalletButton disableOnConnect />}
              signButton={<AptosSignButton />}
              coins={ecosystemMap.Aptos.eligibility?.claimInfo.amount.toString()}
              isEligible={isEligible(Ecosystem.APTOS)}
            />
            <TableRow
              label={'Sui Activity'}
              walletButton={<SuiWalletButton disableOnConnect />}
              signButton={<SuiSignButton />}
              coins={ecosystemMap.Sui.eligibility?.claimInfo.amount.toString()}
              isEligible={isEligible(Ecosystem.SUI)}
            />
            <TableRow
              label={'Injective Activity'}
              walletButton={
                <CosmosWalletButton chainName="injective" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="injective" />}
              coins={ecosystemMap.Injective.eligibility?.claimInfo.amount.toString()}
              isEligible={isEligible(Ecosystem.INJECTIVE)}
            />
            <TableRow
              label={'Osmosis Activity'}
              walletButton={
                <CosmosWalletButton chainName="osmosis" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="osmosis" />}
              coins={ecosystemMap.Osmosis.eligibility?.claimInfo.amount.toString()}
              isEligible={isEligible(Ecosystem.OSMOSIS)}
            />
            <TableRow
              label={'Neutron Activity'}
              walletButton={
                <CosmosWalletButton chainName="neutron" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="neutron" />}
              coins={ecosystemMap.Neutron.eligibility?.claimInfo.amount.toString()}
              isEligible={isEligible(Ecosystem.NEUTRON)}
            />
            <TableRow
              label={'Discord Activity'}
              walletButton={<DiscordButton disableOnAuth />}
              signButton={<DiscordSignButton />}
              coins={ecosystemMap[
                Ecosystem.DISCORD
              ].eligibility?.claimInfo.amount.toString()}
              isEligible={isEligible(Ecosystem.DISCORD)}
            />
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
                  1000 <Coin />{' '}
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
  label: string
  walletButton: ReactElement
  signButton: ReactElement
  coins: string | undefined
  isEligible: boolean
}
function TableRow({
  label,
  walletButton,
  signButton,
  coins,
  isEligible,
}: TableRowProps) {
  return (
    <tr
      className={classNames(
        'border-b border-light-35 ',
        isEligible ? '' : 'disabled'
      )}
    >
      <td className="w-full py-2 pl-10 pr-4">
        <div className="flex items-center justify-between ">
          <span className="min-w-[150px] font-header text-base18 font-thin">
            {label}
          </span>

          <span className="flex flex-1  items-center justify-between gap-5">
            {walletButton}
            {signButton}
          </span>
        </div>
      </td>
      <td className="min-w-[130px] border-l border-light-35 bg-darkGray5">
        <span className="flex items-center justify-center  gap-1 text-[20px]">
          {isEligible ? coins ?? '0' : 'N/A'} <Coin />
        </span>
      </td>
    </tr>
  )
}

export default Eligibility2
