import React, { useMemo, useState } from 'react'
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
} from '@components/wallets/Solana'
import Image from 'next/image'

const Step2 = () => {
  const { publicKey, wallet, disconnect, connecting, connected, connect } =
    useWallet()

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey])

  const buttonText = useMemo(() => {
    if (base58) return base58.slice(0, 4) + '..' + base58.slice(-4)
    if (connecting) return 'Connecting ...'
    if (connected) return 'Connected'
    if (wallet) return 'Connect'
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
                <button
                  className="btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light"
                  onClick={() => {
                    if (base58 === undefined) connect().catch(() => {})
                  }}
                >
                  <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                    <Image
                      src={wallet.adapter.icon}
                      alt="wallet icon"
                      width={20}
                      height={20}
                    />{' '}
                    <span>{buttonText}</span>
                  </span>
                </button>
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
  const { select, wallets } = useWallet()
  const [modal, openModal] = useState(false)
  const [wallet, setWallet] = useState(null)

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => {
            select(PHANTOM_WALLET_ADAPTER.name)
          }}
        >
          <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
            <Phantom /> Phantom
          </span>
        </button>
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => {
            select(BACKPACK_WALLET_ADAPTER.name)
          }}
        >
          <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
            <Backpack /> Backpack
          </span>
        </button>
        <button
          className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
          onClick={() => {
            select(SOLFLARE_WALLET_ADAPTER.name)
          }}
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
      {modal && (
        <Modal openModal={openModal}>
          <h3 className="mb-16  font-header text-[36px] font-light">
            Select Your Wallet
          </h3>
          <div className="mx-auto max-w-[200px]">
            <Listbox value={wallet} onChange={setWallet}>
              {({ open }) => (
                <>
                  <Listbox.Button className="block w-full border border-light-35 py-3 px-8">
                    <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                      <span>explore options</span>
                      <Down className={`${open ? 'rotate-0' : 'rotate-180'}`} />
                    </span>
                  </Listbox.Button>
                  <Transition
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Listbox.Options className="absolute -mt-[1px] w-full divide-y divide-light-35 border border-light-35 bg-darkGray1">
                      {wallets.map((wallet) => (
                        <Listbox.Option
                          key={wallet.adapter.name}
                          value={wallet.adapter.name}
                          className="flex cursor-pointer items-center justify-center gap-2.5 py-3 px-8 hover:bg-darkGray3"
                          onClick={() => {
                            select(wallet.adapter.name)
                            openModal(false)
                          }}
                        >
                          <Image
                            src={wallet.adapter.icon}
                            alt="wallet icon"
                            width={20}
                            height={20}
                          />{' '}
                          {wallet.adapter.name}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </>
              )}
            </Listbox>
          </div>
        </Modal>
      )}
    </>
  )
}

export default Step2
