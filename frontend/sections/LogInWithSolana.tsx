import React, { useMemo, useState } from 'react'

import Phantom from '@images/phantom.inline.svg'
import Backpack from '@images/backpack.inline.svg'
import Solflare from '@images/solflare.inline.svg'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  BACKPACK_WALLET_ADAPTER,
  PHANTOM_WALLET_ADAPTER,
  SOLFLARE_WALLET_ADAPTER,
  useSelectWallet,
  useWallets,
} from '@components/wallets/Solana'
import {
  WalletConnectedButton,
  WalletModal,
} from '@components/wallets/WalletButton'
import { truncateAddress } from 'utils/truncateAddress'
import { ProceedButton, BackButton } from '@components/buttons'
import { StepProps } from './common'
import { Box } from '@components/Box'

export const LogInWithSolana = ({ onBack, onProceed }: StepProps) => {
  const { publicKey, wallet, disconnect, connecting, connected, connect } =
    useWallet()

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey])

  const buttonText = useMemo(() => {
    if (base58) return truncateAddress(base58)
    if (connecting) return 'Connecting ...'
    if (connected) return 'Connected'
    if (wallet) return 'Install'
  }, [base58, connecting, connected, wallet])

  return (
    <Box>
      <div className="flex items-center justify-between border-b border-light-35  bg-[#242339] py-8 px-10">
        <h4 className="font-header text-[28px] font-light leading-[1.2]">
          Log in with Solana
        </h4>
        <BackButton onBack={onBack} />
      </div>
      <div className="px-10 py-8 text-base16">
        <p className="mb-6">
          PYTH tokens are native to Solana. You need a Solana (SPL) wallet to
          proceed and receive your PYTH tokens. Your claimed PYTH tokens will go
          to the Solana wallet you connect in this step.
        </p>
        <p className="">
          You can find a list of popular wallets that support Solana (SPL)
          tokens below.
        </p>
        {wallet === null ? (
          <SelectWallets />
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              <WalletConnectedButton
                onClick={disconnect}
                address={buttonText!}
                icon={wallet?.adapter.icon}
              />
              <span
                className="mt-4 block text-center font-body font-normal underline hover:cursor-pointer"
                onClick={disconnect}
              >
                Change wallet
              </span>
            </div>
            <ProceedButton onProceed={onProceed} />
          </div>
        )}
      </div>
    </Box>
  )
}

const SelectWallets = () => {
  const wallets = useWallets()
  const [modal, openModal] = useState(false)
  const selectWallet = useSelectWallet()

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => selectWallet(PHANTOM_WALLET_ADAPTER)}
        >
          <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
            <Phantom /> Phantom
          </span>
        </button>
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => selectWallet(BACKPACK_WALLET_ADAPTER)}
        >
          <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
            <Backpack /> Backpack
          </span>
        </button>
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => selectWallet(SOLFLARE_WALLET_ADAPTER)}
        >
          <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
            <Solflare /> Solflare
          </span>
        </button>

        <button
          className="ml-4 font-body text-base16 font-normal underline"
          onClick={() => openModal(true)}
        >
          More wallets
        </button>
      </div>
      {modal && <WalletModal openModal={openModal} wallets={wallets} />}
    </>
  )
}
