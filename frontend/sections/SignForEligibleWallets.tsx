import React, { ReactElement, useCallback, useMemo } from 'react'
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
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useCoins } from 'hooks/useCoins'
import { Ecosystem } from '@components/Ecosystem'
import { EcosystemClaimState } from './SignAndClaim'

import Loader from '@images/loader.inline.svg'
import Failed from '@images/not.inline.svg'
import Success from '@images/verified.inline.svg'

function ClaimState({
  ecosystemClaimState,
}: {
  ecosystemClaimState: EcosystemClaimState | undefined
}) {
  const { transactionSignature, loading, error } = ecosystemClaimState ?? {}

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

  if (ecosystemClaimState === undefined) return <></>
  return (
    <div className="flex items-center justify-between gap-4 text-base18">
      {text}
      {icon}
    </div>
  )
}

const Eligibility2 = ({
  onBack,
  onProceed,
  ecosystemsClaimState,
}: {
  onBack: Function
  onProceed: Function
  // this will not be undefined only when some claim is in progress
  ecosystemsClaimState: { [key in Ecosystem]?: EcosystemClaimState } | undefined
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

  const { eligibility } = useEligibility()

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
              signButton={
                ecosystemsClaimState === undefined ? (
                  <SolanaSignButton />
                ) : (
                  <ClaimState
                    ecosystemClaimState={ecosystemsClaimState[Ecosystem.SOLANA]}
                  />
                )
              }
              coins={getEligibleCoins(Ecosystem.SOLANA)}
              isEligible={
                activity.Solana && isEligible(Ecosystem.SOLANA, solanaAddress)
              }
            />
            <TableRow
              label={'EVM Activity'}
              walletButton={<EVMWalletButton disableOnConnect />}
              signButton={
                ecosystemsClaimState === undefined ? (
                  <EVMSignButton />
                ) : (
                  <ClaimState
                    ecosystemClaimState={ecosystemsClaimState[Ecosystem.EVM]}
                  />
                )
              }
              coins={getEligibleCoins(Ecosystem.EVM)}
              isEligible={activity.Evm && isEligible(Ecosystem.EVM, evmAddress)}
            />
            <TableRow
              label={'Aptos Activity'}
              walletButton={<AptosWalletButton disableOnConnect />}
              signButton={
                ecosystemsClaimState === undefined ? (
                  <AptosSignButton />
                ) : (
                  <ClaimState
                    ecosystemClaimState={ecosystemsClaimState[Ecosystem.APTOS]}
                  />
                )
              }
              coins={getEligibleCoins(Ecosystem.APTOS)}
              isEligible={
                activity.Aptos && isEligible(Ecosystem.APTOS, aptosAddress)
              }
            />
            <TableRow
              label={'Sui Activity'}
              walletButton={<SuiWalletButton disableOnConnect />}
              signButton={
                ecosystemsClaimState === undefined ? (
                  <SuiSignButton />
                ) : (
                  <ClaimState
                    ecosystemClaimState={ecosystemsClaimState[Ecosystem.SUI]}
                  />
                )
              }
              coins={getEligibleCoins(Ecosystem.SUI)}
              isEligible={activity.Sui && isEligible(Ecosystem.SUI, suiAddress)}
            />
            <TableRow
              label={'Injective Activity'}
              walletButton={
                <CosmosWalletButton chainName="injective" disableOnConnect />
              }
              signButton={
                ecosystemsClaimState === undefined ? (
                  <CosmosSignButton chainName="injective" />
                ) : (
                  <ClaimState
                    ecosystemClaimState={
                      ecosystemsClaimState[Ecosystem.INJECTIVE]
                    }
                  />
                )
              }
              coins={getEligibleCoins(Ecosystem.INJECTIVE)}
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
              signButton={
                ecosystemsClaimState === undefined ? (
                  <CosmosSignButton chainName="osmosis" />
                ) : (
                  <ClaimState
                    ecosystemClaimState={
                      ecosystemsClaimState[Ecosystem.OSMOSIS]
                    }
                  />
                )
              }
              coins={getEligibleCoins(Ecosystem.OSMOSIS)}
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
              signButton={
                ecosystemsClaimState === undefined ? (
                  <CosmosSignButton chainName="neutron" />
                ) : (
                  <ClaimState
                    ecosystemClaimState={
                      ecosystemsClaimState[Ecosystem.NEUTRON]
                    }
                  />
                )
              }
              coins={getEligibleCoins(Ecosystem.NEUTRON)}
              isEligible={
                activity.Neutron &&
                isEligible(Ecosystem.NEUTRON, neutronAddress)
              }
            />
            <TableRow
              label={'Discord Activity'}
              walletButton={<DiscordButton disableOnAuth />}
              signButton={
                ecosystemsClaimState === undefined ? (
                  <DiscordSignButton />
                ) : (
                  <ClaimState
                    ecosystemClaimState={
                      ecosystemsClaimState[Ecosystem.DISCORD]
                    }
                  />
                )
              }
              coins={getEligibleCoins(Ecosystem.DISCORD)}
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
