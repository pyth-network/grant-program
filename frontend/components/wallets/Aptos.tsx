import {
  AptosWalletAdapterProvider,
  useWallet,
} from '@aptos-labs/wallet-adapter-react'
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import { ReactElement, ReactNode, useMemo, useState } from 'react'
import Wallet from '../../images/wallet.inline.svg'
import Modal from '@components/Claim/Modal'
import Image from 'next/image'

type AptosWalletProviderProps = {
  children: ReactNode
}

export function AptosWalletProvider({
  children,
}: AptosWalletProviderProps): ReactElement {
  const aptosWallets = useMemo(() => [new PetraWallet()], [])

  return (
    <AptosWalletAdapterProvider plugins={aptosWallets} autoConnect>
      {children}
    </AptosWalletAdapterProvider>
  )
}

export function AptosWalletButton() {
  const { disconnect, account, connected, wallet, isLoading } = useWallet()

  console.log(isLoading, connected)
  const buttonText = useMemo(() => {
    if (isLoading) return 'Connecting...'

    return account?.ansName
      ? account?.ansName
      : truncateAddress(account?.address)
  }, [account?.address, account?.ansName, isLoading])

  if (connected === false && isLoading === false)
    return <AptosWalletModalButton />
  return (
    <button
      className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
      onClick={() => disconnect()}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        {wallet?.icon ? (
          <Image src={wallet?.icon} alt="wallet icon" width={20} height={20} />
        ) : (
          <Wallet />
        )}
        <span>{buttonText ?? 'Connected'}</span>
      </span>
    </button>
  )
}

function AptosWalletModalButton() {
  const [modal, openModal] = useState(false)
  const { wallets, connect, isLoading } = useWallet()

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
                <Image
                  src={wallets[0].icon}
                  alt="wallet icon"
                  width={20}
                  height={20}
                />
                <span>
                  {isLoading === true ? 'Connecting...' : wallets[0].name}
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
