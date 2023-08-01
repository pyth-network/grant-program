import { useMemo, useState } from 'react'
import Wallet from '../../images/wallet.inline.svg'
import Modal from '@components/Claim/Modal'
import Image from 'next/image'
import { useWalletKit } from '@mysten/wallet-kit'

export function SuiWalletButton() {
  const {
    currentAccount,
    disconnect,
    isConnected,
    isConnecting,
    currentWallet,
  } = useWalletKit()

  const buttonText = useMemo(() => {
    if (isConnecting) return 'Connecting...'

    return truncateAddress(currentAccount?.address)
  }, [currentAccount?.address, isConnecting])

  if (isConnected === false && isConnecting === false)
    return <SuiWalletModalButton />
  return (
    <button
      className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
      onClick={() => disconnect()}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        {currentWallet?.icon ? (
          <Image
            src={currentWallet?.icon}
            alt="wallet icon"
            width={20}
            height={20}
          />
        ) : (
          <Wallet />
        )}
        <span>{buttonText ?? 'Connected'}</span>
      </span>
    </button>
  )
}

function SuiWalletModalButton() {
  const [modal, openModal] = useState(false)
  const { wallets, connect, isConnecting } = useWalletKit()

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
            <button
              className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
              onClick={() => {
                connect(wallets[0].name)
                openModal(false)
              }}
            >
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                {wallets[0]?.icon ? (
                  <Image
                    src={wallets[0]?.icon}
                    alt="wallet icon"
                    width={20}
                    height={20}
                  />
                ) : (
                  <Wallet />
                )}
                <span>
                  {isConnecting === true ? 'Connecting...' : wallets[0].name}
                </span>
              </span>
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

export const truncateAddress = (address: string | undefined) => {
  if (!address) return
  return `${address.slice(0, 6)}...${address.slice(-5)}`
}
