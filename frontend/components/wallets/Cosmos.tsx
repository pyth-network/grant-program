import { ReactElement, ReactNode, useCallback } from 'react'
import { ChainProvider, useChainWallet } from '@cosmos-kit/react-lite'
import { assets, chains } from 'chain-registry'
import { wallets as keplrWallets } from '@cosmos-kit/keplr'
import { MainWalletBase } from '@cosmos-kit/core'
import {
  WalletButton,
  WalletConnectedButton,
  WalletLoadingButton,
  WalletModalButton,
} from './Common'

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
  const {
    address,
    isWalletConnecting,
    chainWallet,
    isWalletConnected,
    connect,
    logoUrl,
  } = chainWalletContext

  const disconnect = useCallback(
    () => chainWallet?.disconnect(true),
    [chainWallet]
  )

  return (
    <WalletButton
      address={address}
      connected={isWalletConnected}
      isLoading={isWalletConnecting}
      walletModalButton={
        <WalletModalButton
          connect={connect}
          wallets={[{ name: 'keplr', icon: logoUrl, connectId: '' }]}
        />
      }
      walletLoadingButton={<WalletLoadingButton />}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton disconnect={disconnect} address={address} />
      )}
    />
  )
}
