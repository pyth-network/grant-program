import React, { ReactElement, useCallback } from 'react'
import Arrow from '@images/arrow.inline.svg'
import Coin from '@images/coin.inline.svg'

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
import { classNames } from 'utils/classNames'
import { DiscordButton } from '@components/DiscordButton'
import { DiscordSignButton } from '@components/DiscordSignButton'
import {
  useAptosAddress,
  useCosmosAddress,
  useEVMAddress,
  useSolanaAddress,
  useSuiAddress,
} from 'hooks/useAddress'
import { useSession } from 'next-auth/react'
import { useEligiblity } from '@components/Ecosystem/EligibilityProvider'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useCoins } from 'hooks/useCoins'
import { Ecosystem } from '@components/Ecosystem'

const Eligibility2 = ({
  onBack,
  onProceed,
}: {
  onBack: Function
  onProceed: Function
}) => {
  const aptosAddress = useAptosAddress()
  const injectiveAddress = useCosmosAddress('injective')
  const osmosisAddress = useCosmosAddress('osmosis')
  const neutronAddress = useCosmosAddress('neutron')
  const evmAddress = useEVMAddress()
  const solanaAddress = useSolanaAddress()
  const suiAddress = useSuiAddress()

  const { data } = useSession()

  const { activity } = useActivity()

  const { eligibility } = useEligiblity()

  const getEligibleCoins = useCoins()

  const isEligible = useCallback(
    (ecosystem: Ecosystem, identity: string | undefined | null) => {
      return identity ? eligibility[ecosystem][identity] !== undefined : false
    },
    [eligibility]
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
              coins={getEligibleCoins(Ecosystem.SOLANA, solanaAddress)}
              isEligible={
                activity.Solana && isEligible(Ecosystem.SOLANA, solanaAddress)
              }
            />
            <TableRow
              label={'EVM Activity'}
              walletButton={<EVMWalletButton disableOnConnect />}
              signButton={<EVMSignButton />}
              coins={getEligibleCoins(Ecosystem.EVM, evmAddress)}
              isEligible={activity.Evm && isEligible(Ecosystem.EVM, evmAddress)}
            />
            <TableRow
              label={'Aptos Activity'}
              walletButton={<AptosWalletButton disableOnConnect />}
              signButton={<AptosSignButton />}
              coins={getEligibleCoins(Ecosystem.APTOS, aptosAddress)}
              isEligible={
                activity.Aptos && isEligible(Ecosystem.APTOS, aptosAddress)
              }
            />
            <TableRow
              label={'Sui Activity'}
              walletButton={<SuiWalletButton disableOnConnect />}
              signButton={<SuiSignButton />}
              coins={getEligibleCoins(Ecosystem.SUI, suiAddress)}
              isEligible={activity.Sui && isEligible(Ecosystem.SUI, suiAddress)}
            />
            <TableRow
              label={'Injective Activity'}
              walletButton={
                <CosmosWalletButton chainName="injective" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="injective" />}
              coins={getEligibleCoins(Ecosystem.INJECTIVE, injectiveAddress)}
              isEligible={
                activity.Injective &&
                isEligible(Ecosystem.INJECTIVE, injectiveAddress)
              }
            />
            <TableRow
              label={'Osmosis Activity'}
              walletButton={
                <CosmosWalletButton chainName="osmosis" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="osmosis" />}
              coins={getEligibleCoins(Ecosystem.OSMOSIS, osmosisAddress)}
              isEligible={
                activity.Osmosis &&
                isEligible(Ecosystem.OSMOSIS, osmosisAddress)
              }
            />
            <TableRow
              label={'Neutron Activity'}
              walletButton={
                <CosmosWalletButton chainName="neutron" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="neutron" />}
              coins={getEligibleCoins(Ecosystem.NEUTRON, neutronAddress)}
              isEligible={
                activity.Neutron &&
                isEligible(Ecosystem.NEUTRON, neutronAddress)
              }
            />
            <TableRow
              label={'Discord Activity'}
              walletButton={<DiscordButton disableOnAuth />}
              signButton={<DiscordSignButton />}
              coins={getEligibleCoins(Ecosystem.DISCORD, data?.user?.name)}
              isEligible={
                activity['Pyth Discord'] &&
                isEligible(Ecosystem.DISCORD, data?.user?.name)
              }
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
  coins: string | undefined | null
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
