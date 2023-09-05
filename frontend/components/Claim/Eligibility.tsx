import React, { ReactElement } from 'react'
import Arrow from '../../images/arrow.inline.svg'
import Coin from '../../images/coin.inline.svg'

import TooltipIcon from '../../images/tooltip.inline.svg'
import Verified from '../../images/verified.inline.svg'
import Tooltip from '@components/Tooltip'

import { AptosWalletButton } from '@components/wallets/Aptos'
import { SuiWalletButton } from '@components/wallets/Sui'
import { EVMWalletButton } from '@components/wallets/EVM'
import { CosmosWalletButton } from '@components/wallets/Cosmos'
import { SolanaWalletButton } from '@components/wallets/Solana'
import { Ecosystem } from '@components/EcosystemProvider'
import { classNames } from 'utils/classNames'
import { DiscordButton } from '@components/DiscordButton'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useEligiblity } from '@components/Ecosystem/EligibilityProvider'
import {
  useAptosAddress,
  useCosmosAddress,
  useEVMAddress,
  useSolanaAddress,
  useSuiAddress,
} from 'hooks/useAddress'
import { useSession } from 'next-auth/react'

// TODO: Add loading support for sub components to disable proceed back buttons.
const Eligibility = ({
  onBack,
  onProceed,
}: {
  onBack: Function
  onProceed: Function
}) => {
  const { activity } = useActivity()
  const { eligibility } = useEligiblity()

  const aptosAddress = useAptosAddress()
  const injectiveAddress = useCosmosAddress('injective')
  const osmosisAddress = useCosmosAddress('osmosis')
  const neutronAddress = useCosmosAddress('neutron')
  const evmAddress = useEVMAddress()
  const solanaAddress = useSolanaAddress()
  const suiAddress = useSuiAddress()

  const { data } = useSession()

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
            coins={
              solanaAddress &&
              eligibility[solanaAddress]?.claimInfo.amount.toString()
            }
            isActive={activity.Solana}
          />
          <TableRow
            label={'EVM Activity'}
            actionButton={<EVMWalletButton />}
            coins={
              evmAddress && eligibility[evmAddress]?.claimInfo.amount.toString()
            }
            isActive={activity.Evm}
          />
          <TableRow
            label={'Aptos Activity'}
            actionButton={<AptosWalletButton />}
            coins={
              aptosAddress &&
              eligibility[aptosAddress]?.claimInfo.amount.toString()
            }
            isActive={activity.Aptos}
          />
          <TableRow
            label={'Sui Activity'}
            actionButton={<SuiWalletButton />}
            coins={
              suiAddress && eligibility[suiAddress]?.claimInfo.amount.toString()
            }
            isActive={activity.Sui}
          />
          <TableRow
            label={'Injective Activity'}
            actionButton={<CosmosWalletButton chainName="injective" />}
            coins={
              injectiveAddress &&
              eligibility[injectiveAddress]?.claimInfo.amount.toString()
            }
            isActive={activity.Injective}
          />
          <TableRow
            label={'Osmosis Activity'}
            actionButton={<CosmosWalletButton chainName="osmosis" />}
            coins={
              osmosisAddress &&
              eligibility[osmosisAddress]?.claimInfo.amount.toString()
            }
            isActive={activity.Osmosis}
          />
          <TableRow
            label={'Neutron Activity'}
            actionButton={<CosmosWalletButton chainName="neutron" />}
            coins={
              neutronAddress &&
              eligibility[neutronAddress]?.claimInfo.amount.toString()
            }
            isActive={activity.Neutron}
          />
          <TableRow
            label={'Discord Activity'}
            actionButton={<DiscordButton />}
            coins={
              data?.user?.name &&
              eligibility[data?.user?.name]?.claimInfo.amount.toString()
            }
            isActive={activity[Ecosystem.DISCORD]}
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
  coins: string | undefined | null
  isActive: boolean
}
function TableRow({ label, actionButton, coins, isActive }: TableRowProps) {
  return (
    <tr
      className={classNames(
        'border-b border-light-35 ',
        isActive ? '' : 'disabled'
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
          {isActive ? coins ?? '0' : 'N/A'} <Coin />
        </span>
      </td>
    </tr>
  )
}

export default Eligibility
