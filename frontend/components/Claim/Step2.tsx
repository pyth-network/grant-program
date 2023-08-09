import React, { useCallback, useMemo, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'

import Phantom from '../../images/phantom.inline.svg'
import Backpack from '../../images/backpack.inline.svg'
import Solflare from '../../images/solflare.inline.svg'
import Arrow from '../../images/arrow.inline.svg'
import Modal from './Modal'
import Down from '../../images/down2.inline.svg'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  BACKPACK_WALLET_ADAPTER,
  PHANTOM_WALLET_ADAPTER,
  SOLFLARE_WALLET_ADAPTER,
  useSelectWallet,
  useWallets,
} from '@components/wallets/Solana'
import Image from 'next/image'
import {
  WalletConnectedButton,
  WalletModal,
} from '@components/wallets/WalletButton'
import { truncateAddress } from 'utils/truncateAddress'
import { Adapter } from '@solana/wallet-adapter-base'

const Step2 = () => {
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
    <>
      <div className=" border border-light-35 bg-dark">
        <div className="flex items-center justify-between border-b border-light-35  bg-[#242339] py-8 px-10">
          <h4 className="font-header text-[28px] font-light leading-[1.2]">
            Log in with Solana
          </h4>
          <button className="btn before:btn-bg  btn--dark before:bg-[#242339] hover:text-dark hover:before:bg-light">
            <span className="relative inline-flex items-center whitespace-nowrap">
              <Arrow className="mr-2.5 origin-center rotate-180" />
              back
            </span>
          </button>
        </div>
        <div className="px-10 py-8 text-base16">
          <p className="mb-6">
            PYTH tokens are native to Solana. You will need a Solana wallet to
            receive your tokens and to resume progress on this page if you leave
            before claiming. Your claimed PYTH tokens will go to the Solana
            wallet you connect in this step.
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
                  onHoverText={'disconnect'}
                />
                <span
                  className="mt-4 block text-center font-body font-normal underline hover:cursor-pointer"
                  onClick={disconnect}
                >
                  Change wallet
                </span>
              </div>
              <button className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark">
                <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                  proceed <Arrow />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
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

export default Step2
