import Modal from '@components/Modal'
import Wallet from '@images/wallet.inline.svg'
import Image from 'next/image'
import { ReactElement, useLayoutEffect, useState } from 'react'
import { truncateAddress } from 'utils/truncateAddress'

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
      className="btn before:btn-bg btn--dark min-w-[117px] before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark sm:min-w-[207px]"
      onClick={onClick}
      onMouseEnter={() => !disabled && setButtonText(onHoverText)}
      onMouseLeave={() => !disabled && setButtonText(dispAddress)}
      disabled={disabled}
    >
      <span className="relative inline-flex items-center gap-1 whitespace-nowrap  pt-1 sm:gap-2.5">
        {/* hack here pt-1 to make it centered visually */}
        <WalletIcon icon={icon} />
        <span className="text-xs sm:text-base">{buttonText}</span>
      </span>
    </button>
  )
}

export function WalletLoadingButton() {
  return (
    <button className="btn before:btn-bg btn--dark min-w-[107px] before:bg-dark hover:text-dark hover:before:bg-light sm:min-w-[207px]">
      <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
        <WalletIcon />
        <span className="text-xs sm:text-base">Connecting...</span>
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
        className="btn before:btn-bg btn--dark min-w-[117px] before:bg-dark hover:text-dark hover:before:bg-light sm:min-w-[207px]"
        onClick={() => openModal(true)}
      >
        <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
          <Wallet />
          <span className="text-xs sm:text-base">connect wallet</span>
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
      <h3 className="mb-8 font-header  text-[24px] font-light sm:mb-16 sm:text-[36px]">
        Connect Your Wallet
      </h3>
      <div className="mx-auto flex max-w-[200px] flex-col justify-around gap-y-4">
        {wallets.map((wallet) => {
          return (
            <SingleWalletView
              wallet={wallet}
              onSelect={() => openModal(false)}
              key={wallet.icon}
            />
          )
        })}
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
      className="before:btn-bg btn--dark relative flex h-[44px] min-w-[117px] items-center justify-center px-4 font-body text-base transition-all before:bg-dark hover:text-dark hover:before:bg-light sm:min-w-[207px] md:px-8 "
      onClick={() => {
        wallet.onSelect()
        onSelect()
      }}
    >
      <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
        <WalletIcon icon={wallet.icon} />
        <span>{wallet.name}</span>
      </span>
    </button>
  )
}

export function WalletIcon({ icon }: { icon?: string }) {
  return icon ? (
    <Image src={icon} alt="wallet icon" width={20} height={20} />
  ) : (
    <Wallet />
  )
}
