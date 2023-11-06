import { ReactElement, ReactNode, useEffect } from 'react'
import { ChainProvider, useChainWallet } from '@cosmos-kit/react-lite'
import { assets, chains } from '../../utils/chain-registry'
import { wallets as keplrWallets } from '@cosmos-kit/keplr-extension'
import { wallets as compassWallets } from '@cosmos-kit/compass-extension'
import { MainWalletBase } from '@cosmos-kit/core'
import { WalletButton, WalletConnectedButton } from './WalletButton'

import keplr from '@images/keplr.svg'

export const WALLET_NAME = 'keplr-extension'

export type ChainName = 'osmosis' | 'neutron' | 'sei'

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
      wallets={
        [...keplrWallets, ...compassWallets] as unknown as MainWalletBase[]
      }
    >
      {children}
    </ChainProvider>
  )
}

type CosmosWalletButtonProps = {
  chainName: ChainName
  disableOnConnect?: boolean
}
export function CosmosWalletButton({
  chainName,
  disableOnConnect,
}: CosmosWalletButtonProps) {
  const chainWalletContext = useChainWallet(chainName, WALLET_NAME)
  const {
    address,
    isWalletConnecting,
    isWalletConnected,
    connect,
    isWalletNotExist,
    disconnect,
    isWalletDisconnected,
  } = chainWalletContext

  // Keplr doesn't provide any autoconnect feature
  // Implementing it here
  // When this component will render, it will check a localStorage key
  // to know if the wallet was previously connected. If it was, it will
  // connect with it again. Else, will do nothing
  // We only have to do this check once the component renders.
  // See Line 84, 99 to know how we are storing the status locally
  useEffect(() => {
    const key = getKeplrConnectionStatusKey(chainName)
    const connected = localStorage.getItem(key)
    if (connected === 'true') {
      connect()
    }
  }, [])

  // The initial value of `isWalletNotExist` is false.
  // When the user clicks on connect, the value of `isWalletNotExist` is first set to false,
  // doesn't matter what the previous value was. and if it the wallet doesn't exist the
  // value `isWalletNotExist` will change to true. Once, the value of `isWalletNotExist`
  // changes to true, this useEffect will redirect the user to the keplr webpage.
  useEffect(() => {
    if (isWalletNotExist) window.open('https://www.keplr.app/download')
  }, [isWalletNotExist])

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (isWalletConnected === true && address !== undefined) {
        // Here, store locally that the wallet was connected
        localStorage.setItem(getKeplrConnectionStatusKey(chainName), 'true')
      }
    })()
    if (isWalletDisconnected)
      localStorage.setItem(getKeplrConnectionStatusKey(chainName), 'false')
  }, [isWalletConnected, address, chainName, isWalletDisconnected])

  return (
    <WalletButton
      address={address}
      connected={isWalletConnected}
      isLoading={isWalletConnecting}
      wallets={[{ name: 'keplr', icon: keplr, onSelect: connect }]}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={address}
          disabled={disableOnConnect}
          icon={keplr}
        />
      )}
    />
  )
}

function getKeplrConnectionStatusKey(chainName: ChainName) {
  const KEPLR_CONNECTION_STATUS_KEY = 'keplr-local-storage-connection-key'
  return KEPLR_CONNECTION_STATUS_KEY + '-' + chainName
}
