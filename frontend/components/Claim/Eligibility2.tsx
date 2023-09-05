import React, { ReactElement } from 'react'
import Arrow from '../../images/arrow.inline.svg'
import Coin from '../../images/coin.inline.svg'

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
import {
  useAptosAddress,
  useCosmosAddress,
  useEVMAddress,
  useSolanaAddress,
  useSuiAddress,
} from 'hooks/useAddress'
import { useSession } from 'next-auth/react'
import { useEligiblity } from '@components/Ecosystem/EligibilityProvider'

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

  const { eligibility } = useEligiblity()

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
              coins={
                solanaAddress &&
                eligibility[solanaAddress]?.claimInfo.amount.toString()
              }
              isEligible={
                solanaAddress ? eligibility[solanaAddress] !== undefined : false
              }
            />
            <TableRow
              label={'EVM Activity'}
              walletButton={<EVMWalletButton disableOnConnect />}
              signButton={<EVMSignButton />}
              coins={
                evmAddress &&
                eligibility[evmAddress]?.claimInfo.amount.toString()
              }
              isEligible={
                evmAddress ? eligibility[evmAddress] !== undefined : false
              }
            />
            <TableRow
              label={'Aptos Activity'}
              walletButton={<AptosWalletButton disableOnConnect />}
              signButton={<AptosSignButton />}
              coins={
                aptosAddress &&
                eligibility[aptosAddress]?.claimInfo.amount.toString()
              }
              isEligible={
                aptosAddress ? eligibility[aptosAddress] !== undefined : false
              }
            />
            <TableRow
              label={'Sui Activity'}
              walletButton={<SuiWalletButton disableOnConnect />}
              signButton={<SuiSignButton />}
              coins={
                suiAddress &&
                eligibility[suiAddress]?.claimInfo.amount.toString()
              }
              isEligible={
                suiAddress ? eligibility[suiAddress] !== undefined : false
              }
            />
            <TableRow
              label={'Injective Activity'}
              walletButton={
                <CosmosWalletButton chainName="injective" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="injective" />}
              coins={
                injectiveAddress &&
                eligibility[injectiveAddress]?.claimInfo.amount.toString()
              }
              isEligible={
                injectiveAddress
                  ? eligibility[injectiveAddress] !== undefined
                  : false
              }
            />
            <TableRow
              label={'Osmosis Activity'}
              walletButton={
                <CosmosWalletButton chainName="osmosis" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="osmosis" />}
              coins={
                osmosisAddress &&
                eligibility[osmosisAddress]?.claimInfo.amount.toString()
              }
              isEligible={
                osmosisAddress
                  ? eligibility[osmosisAddress] !== undefined
                  : false
              }
            />
            <TableRow
              label={'Neutron Activity'}
              walletButton={
                <CosmosWalletButton chainName="neutron" disableOnConnect />
              }
              signButton={<CosmosSignButton chainName="neutron" />}
              coins={
                neutronAddress &&
                eligibility[neutronAddress]?.claimInfo.amount.toString()
              }
              isEligible={
                neutronAddress
                  ? eligibility[neutronAddress] !== undefined
                  : false
              }
            />
            <TableRow
              label={'Discord Activity'}
              walletButton={<DiscordButton disableOnAuth />}
              signButton={<DiscordSignButton />}
              coins={
                data?.user?.name &&
                eligibility[data?.user?.name]?.claimInfo.amount.toString()
              }
              isEligible={
                data?.user?.name
                  ? eligibility[data?.user?.name] !== undefined
                  : false
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
