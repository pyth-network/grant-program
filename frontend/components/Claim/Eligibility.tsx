import React, { ReactElement, useEffect, useMemo } from 'react'
import Arrow from '../../images/arrow.inline.svg'
import Coin from '../../images/coin.inline.svg'

import TooltipIcon from '../../images/tooltip.inline.svg'
import Verified from '../../images/verified.inline.svg'
import Discord from '../../images/discord.inline.svg'
import Tooltip from '@components/Tooltip'

import { AptosWalletButton } from '@components/wallets/Aptos'
import { SuiWalletButton } from '@components/wallets/Sui'
import { EVMWalletButton } from '@components/wallets/EVM'
import { CosmosWalletButton } from '@components/wallets/Cosmos'
import { SolanaWalletButton } from '@components/wallets/Solana'
import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { ECOSYSTEM, useEcosystem } from '@components/EcosystemProvider'
import { fetchAmountAndProof } from 'utils/api'
import { classNames } from 'utils/classNames'

// TODO: Add loading support for sub components to disable proceed back buttons.
const Eligibility = ({
  onBack,
  onProceed,
}: {
  onBack: Function
  onProceed: Function
}) => {
  const { map: ecosystemMap } = useEcosystem()
  return (
    <div className=" border border-light-35 bg-dark">
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
      <table>
        <tbody>
          <TableRow
            label={'Solana Activity'}
            actionButton={<SolanaWalletButton />}
            coins={ecosystemMap.Solana.eligibility?.claimInfo.amount.toString()}
            disabled={!ecosystemMap.Solana.isActive}
          />
          <TableRow
            label={'EVM Activity'}
            actionButton={<EVMWalletButton />}
            coins={ecosystemMap.Evm.eligibility?.claimInfo.amount.toString()}
            disabled={!ecosystemMap.Evm.isActive}
          />
          <TableRow
            label={'Aptos Activity'}
            actionButton={<AptosWalletButton />}
            coins={ecosystemMap.Aptos.eligibility?.claimInfo.amount.toString()}
            disabled={!ecosystemMap.Aptos.isActive}
          />
          <TableRow
            label={'Sui Activity'}
            actionButton={<SuiWalletButton />}
            coins={ecosystemMap.Sui.eligibility?.claimInfo.amount.toString()}
            disabled={!ecosystemMap.Sui.isActive}
          />
          <TableRow
            label={'Injective Activity'}
            actionButton={<CosmosWalletButton chainName="injective" />}
            coins={ecosystemMap.Injective.eligibility?.claimInfo.amount.toString()}
            disabled={!ecosystemMap.Injective.isActive}
          />
          <TableRow
            label={'Osmosis Activity'}
            actionButton={<CosmosWalletButton chainName="osmosis" />}
            coins={ecosystemMap.Osmosis.eligibility?.claimInfo.amount.toString()}
            disabled={!ecosystemMap.Osmosis.isActive}
          />
          <TableRow
            label={'Neutron Activity'}
            actionButton={<CosmosWalletButton chainName="neutron" />}
            coins={ecosystemMap.Neutron.eligibility?.claimInfo.amount.toString()}
            disabled={!ecosystemMap.Neutron.isActive}
          />
          <TableRow
            label={'Discord Activity'}
            actionButton={<DiscordButton />}
            coins={ecosystemMap[
              ECOSYSTEM.DISCORD
            ].eligibility?.claimInfo.amount.toString()}
            disabled={!ecosystemMap[ECOSYSTEM.DISCORD].isActive}
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
  )
}

type TableRowProps = {
  label: string
  actionButton: ReactElement
  coins: string | undefined
  disabled: boolean
}
function TableRow({ label, actionButton, coins, disabled }: TableRowProps) {
  return (
    <tr
      className={classNames(
        'border-b border-light-35 ',
        disabled ? 'disabled' : ''
      )}
    >
      <td className="w-full py-2 pl-10 pr-4">
        <div className="flex items-center justify-between">
          <span className="font-header text-base18 font-thin">{label}</span>
          <span className="flex items-center gap-5">
            {actionButton}
            <Tooltip content="Congratulations! This wallet is successfully connected. Click on the wallet address to change to another wallet.">
              <TooltipIcon />
            </Tooltip>
            <Verified />
          </span>
        </div>
      </td>
      <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
        <span className="flex items-center justify-center  gap-1 text-[20px]">
          {disabled ? 'N/A' : coins ?? '0'} <Coin />
        </span>
      </td>
    </tr>
  )
}

function DiscordButton() {
  const { data, status } = useSession()

  const { logo, text } = useMemo(() => {
    if (status === 'authenticated')
      return {
        logo: data.user?.image ? (
          <Image
            src={data.user?.image}
            alt="user image"
            width={20}
            height={20}
          />
        ) : (
          <Discord />
        ),
        text: data.user?.name ?? 'Signed In',
      }

    return {
      logo: <Discord />,
      text: 'Sign In',
    }
  }, [status, data?.user])

  const { setEligibility } = useEcosystem()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (status === 'authenticated' && data?.user?.name) {
        const eligibility = await fetchAmountAndProof(
          'discord',
          data?.user?.name
        )
        setEligibility(ECOSYSTEM.DISCORD, eligibility)
      } else {
        setEligibility(ECOSYSTEM.DISCORD, undefined)
      }
    })()
  }, [status, setEligibility, data?.user?.name])

  return (
    <button
      className={
        'btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light'
      }
      onClick={() => {
        if (status === 'unauthenticated') signIn('discord')
        if (status === 'authenticated') signOut()
      }}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        {logo}
        <span>{text}</span>
      </span>
    </button>
  )
}

export default Eligibility
