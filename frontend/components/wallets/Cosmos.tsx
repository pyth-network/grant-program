import { ReactElement, ReactNode, useCallback, useEffect } from 'react'
import { ChainProvider, useChainWallet } from '@cosmos-kit/react-lite'
import { assets, chains } from 'chain-registry'
import { wallets } from '@cosmos-kit/keplr-extension'
import { MainWalletBase } from '@cosmos-kit/core'
import { WalletButton, WalletConnectedButton } from './WalletButton'

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
      wallets={[...wallets] as unknown as MainWalletBase[]}
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
  const {
    address,
    isWalletConnecting,
    isWalletConnected,
    connect,
    logoUrl,
    isWalletNotExist,
    disconnect,
  } = chainWalletContext

  // The initial value of `isWalletNotExist` is set to false.
  // When the user clicks on connect, the value of `isWalletNotExist` changes to false
  // and then if it the wallet doesnot exist the value `isWalletNotExist` will change to true.
  // Once, the value of `isWalletNotExist` changes to true, this useEffect will redirect
  // the user to the keplr webpage.
  useEffect(() => {
    if (isWalletNotExist) window.open('https://www.keplr.app/download')
  }, [isWalletNotExist])

  return (
    <WalletButton
      address={address}
      connected={isWalletConnected}
      isLoading={isWalletConnecting}
      wallets={[{ name: 'keplr', icon: logoUrl, onSelect: connect }]}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton onClick={disconnect} address={address} />
      )}
    />
  )
}
