import { ReactElement, useLayoutEffect, useState } from 'react'
import { truncateAddress } from 'utils/truncateAddress'
import Wallet from '../../images/wallet.inline.svg'
import Image from 'next/image'
import Modal from '@components/Claim/Modal'
import { Listbox, Transition } from '@headlessui/react'
import Down from '../../images/down2.inline.svg'

export type WalletConnectedButtonProps = {
  onClick: () => void
  address: string
  icon?: string
  onHoverText?: string
  disabled?: boolean
}

export function WalletConnectedButton({
  onClick,
  address,
  icon,
  onHoverText = 'disconnect',
  disabled,
}: WalletConnectedButtonProps) {
  const dispAddress = truncateAddress(address)

  const [buttonText, setButtonText] = useState<string>()

  useLayoutEffect(() => {
    setButtonText(dispAddress)
  }, [dispAddress])

  return (
    <button
      className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark"
      onClick={onClick}
      onMouseEnter={() => !disabled && setButtonText(onHoverText)}
      onMouseLeave={() => !disabled && setButtonText(dispAddress)}
      disabled={disabled}
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
  walletConnectedButton: (address: string) => ReactElement
  address: string | undefined
  wallets: Wallet[]
}

// WalletButton expects that the address won't be undefined
// When the wallet is connected
export function WalletButton({
  connected,
  isLoading,
  walletConnectedButton,
  wallets,
  address,
}: WalletButtonProps) {
  if (isLoading === true) return <WalletLoadingButton />
  else if (connected === true) return walletConnectedButton(address!)
  return <WalletModalButton wallets={wallets} />
}

export type Wallet = {
  icon?: string
  name: string
  onSelect: () => void
}
export type WalletModalButtonProps = {
  wallets: Wallet[]
}
export function WalletModalButton({ wallets }: WalletModalButtonProps) {
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
      {modal && <WalletModal openModal={openModal} wallets={wallets} />}
    </>
  )
}

export type WalletModalProps = {
  openModal: Function
  wallets: Wallet[]
}
export function WalletModal({ openModal, wallets }: WalletModalProps) {
  return (
    <Modal openModal={openModal}>
      <h3 className="mb-16  font-header text-[36px] font-light">
        Connect Your Wallet
      </h3>
      <div className="mx-auto max-w-[200px]">
        {wallets.length === 1 ? (
          <SingleWalletView
            wallet={wallets[0]}
            onSelect={() => openModal(false)}
          />
        ) : (
          <MultiWalletView
            wallets={wallets}
            onSelect={() => openModal(false)}
          />
        )}
      </div>
    </Modal>
  )
}

export type SingleWalletViewProps = {
  wallet: Wallet
  onSelect: () => void
}
export function SingleWalletView({ wallet, onSelect }: SingleWalletViewProps) {
  return (
    <button
      className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
      onClick={() => {
        wallet.onSelect()
        onSelect()
      }}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        <WalletIcon icon={wallet.icon} />
        <span>{wallet.name}</span>
      </span>
    </button>
  )
}

export type MultiWalletViewProps = WalletModalButtonProps & {
  onSelect: () => void
}

export function MultiWalletView({ wallets, onSelect }: MultiWalletViewProps) {
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
                    wallet.onSelect()
                    onSelect()
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
