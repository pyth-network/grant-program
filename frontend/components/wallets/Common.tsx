import { ReactElement, useLayoutEffect, useMemo, useState } from 'react'
import { truncateAddress } from 'utils/truncateAddress'
import Wallet from '../../images/wallet.inline.svg'
import Image from 'next/image'
import Modal from '@components/Claim/Modal'
import { Listbox, Transition } from '@headlessui/react'
import Down from '../../images/down2.inline.svg'

export type WalletConnectedButtonProps = {
  disconnect: () => void
  address: string
  icon?: string
}

export function WalletConnectedButton({
  disconnect,
  address,
  icon,
}: WalletConnectedButtonProps) {
  const dispAddress = truncateAddress(address)

  const [buttonText, setButtonText] = useState<string>()

  useLayoutEffect(() => {
    setButtonText(dispAddress)
  }, [dispAddress])

  return (
    <button
      className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
      onClick={() => disconnect()}
      onMouseEnter={() => setButtonText('disconnect')}
      onMouseLeave={() => setButtonText(dispAddress)}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        <WalletIcon icon={icon} />
        <span>{buttonText}</span>
      </span>
    </button>
  )
}

export type WalletLoadingButtonProps = {
  icon?: string
}
export function WalletLoadingButton({ icon }: WalletLoadingButtonProps) {
  return (
    <button className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light">
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        <WalletIcon icon={icon} />
        <span>Connecting...</span>
      </span>
    </button>
  )
}

export type WalletButtonProps = {
  connected: boolean
  isLoading: boolean
  walletModalButton: ReactElement
  walletLoadingButton: ReactElement
  walletConnectedButton: (address: string) => ReactElement
  address: string | undefined
}

// WalletButton expects that the address won't be undefined
// When the wallet is connected
export function WalletButton({
  connected,
  isLoading,
  walletModalButton,
  walletLoadingButton,
  walletConnectedButton,
  address,
}: WalletButtonProps) {
  if (isLoading === true) return walletLoadingButton
  else if (connected === true) return walletConnectedButton(address!)
  return walletModalButton
}

export type Wallet<T> = {
  icon?: string
  name: string
  connectId: T
}
export type WalletModalButtonProps<T> = {
  connect: (connectId: T) => void
  wallets: Wallet<T>[]
}
export function WalletModalButton<T = string>({
  connect,
  wallets,
}: WalletModalButtonProps<T>) {
  const [modal, openModal] = useState(false)

  return (
    <>
      <button
        className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
        onClick={() => openModal(true)}
      >
        <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
          <Wallet />
          <span>connect wallet</span>
        </span>
      </button>
      {modal && (
        <Modal openModal={openModal}>
          <h3 className="mb-16  font-header text-[36px] font-light">
            Connect Your Wallet
          </h3>
          <div className="mx-auto max-w-[200px]">
            {wallets.length === 1 ? (
              <SingleWalletView
                wallet={wallets[0]}
                connect={connect}
                onConnect={() => openModal(false)}
              />
            ) : (
              <MultiWalletView
                wallets={wallets}
                connect={connect}
                onConnect={() => openModal(false)}
              />
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

export type SingleWalletViewProps<T> = {
  wallet: Wallet<T>
  connect: (connectId: T) => void
  onConnect: () => void
}
export function SingleWalletView<T>({
  wallet,
  connect,
  onConnect,
}: SingleWalletViewProps<T>) {
  return (
    <button
      className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
      onClick={() => {
        connect(wallet.connectId)
        onConnect()
      }}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        <WalletIcon icon={wallet.icon} />
        <span>{wallet.name}</span>
      </span>
    </button>
  )
}

export type MultiWalletViewProps<T> = WalletModalButtonProps<T> & {
  onConnect: () => void
}

export function MultiWalletView<T>({
  wallets,
  connect,
  onConnect,
}: MultiWalletViewProps<T>) {
  return (
    <Listbox>
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
                  key={wallet.name}
                  value={wallet.name}
                  className="flex cursor-pointer items-center justify-center gap-2.5 py-3 px-8 hover:bg-darkGray3"
                  onClick={() => {
                    connect(wallet.connectId)
                    onConnect()
                  }}
                >
                  <WalletIcon icon={wallet.icon} />
                  {wallet.name}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </>
      )}
    </Listbox>
  )
}

export function WalletIcon({ icon }: { icon?: string }) {
  return icon ? (
    <Image src={icon} alt="wallet icon" width={20} height={20} />
  ) : (
    <Wallet />
  )
}
