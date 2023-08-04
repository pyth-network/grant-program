import { ReactElement, ReactNode, useMemo, useState } from 'react'
import Wallet from '../../images/wallet.inline.svg'
import Modal from '@components/Claim/Modal'
import Image from 'next/image'
import { ChainProvider, useChainWallet } from '@cosmos-kit/react-lite'
import { assets, chains } from 'chain-registry'
import { wallets as keplrWallets } from '@cosmos-kit/keplr'
import { MainWalletBase, ChainWalletContext } from '@cosmos-kit/core'
import { truncateAddress } from 'utils/truncateAddress'

const walletName = 'keplr-extension'

type CosmosWalletProviderProps = {
  children: ReactNode
}

export function CosmosWalletProvider({
  children,
}: CosmosWalletProviderProps): ReactElement {
  return (
    <ChainProvider
      chains={chains}
      assetLists={assets}
      wallets={[...keplrWallets] as unknown as MainWalletBase[]}
    >
      {children}
    </ChainProvider>
  )
}

type CosmosWalletButtonProps = {
  chainName: 'injective' | 'osmosis' | 'neutron'
}
export function CosmosWalletButton({ chainName }: CosmosWalletButtonProps) {
  const chainWalletContext = useChainWallet(chainName, walletName)
  const { address, isWalletDisconnected, isWalletConnecting, chainWallet } =
    chainWalletContext

  const buttonText = useMemo(() => {
    if (isWalletConnecting) return 'Connecting...'

    return truncateAddress(address)
  }, [address, isWalletConnecting])

  if (isWalletDisconnected === true && isWalletConnecting === false)
    return <CosmosWalletModalButton chainWalletContext={chainWalletContext} />
  return (
    <button
      className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
      onClick={() => {
        chainWallet?.disconnect(true)
      }}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        <Wallet />
        <span>{buttonText ?? 'Connected'}</span>
      </span>
    </button>
  )
}

type CosmosWalletModalButtonProps = {
  chainWalletContext: ChainWalletContext
}
function CosmosWalletModalButton({
  chainWalletContext,
}: CosmosWalletModalButtonProps) {
  const [modal, openModal] = useState(false)

  const { logoUrl, isWalletConnecting, connect } = chainWalletContext

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
                connect()
                openModal(false)
              }}
            >
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="wallet icon"
                    width={20}
                    height={20}
                  />
                ) : (
                  <Wallet />
                )}
                <span>
                  {isWalletConnecting === true ? 'Connecting...' : 'Keplr'}
                </span>
              </span>
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
