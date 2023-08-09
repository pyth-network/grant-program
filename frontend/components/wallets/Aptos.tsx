import {
  AptosWalletAdapterProvider,
  Wallet,
  useWallet,
} from '@aptos-labs/wallet-adapter-react'
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import { ReactElement, ReactNode, useCallback, useMemo } from 'react'
import { WalletButton, WalletConnectedButton } from './WalletButton'

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
  const {
    disconnect,
    account,
    connected,
    wallet,
    isLoading,
    connect,
    wallets,
  } = useWallet()

  // If the wallet is connected or loadable, try to connect to it.
  // Else, redirect user to the wallet webpage.
  const connectWallet = useCallback(
    (wallet: Wallet) => {
      if (wallet.readyState === 'Installed' || wallet.readyState === 'Loadable')
        connect(wallet.name)
      else if (wallet.readyState === 'NotDetected')
        window.open(wallet.url, '_blank')
    },
    [connect]
  )

  return (
    <WalletButton
      address={account?.address}
      connected={connected}
      isLoading={isLoading}
      wallets={wallets.map((wallet) => ({
        icon: wallet.icon,
        name: wallet.name,
        connect: () => connectWallet(wallet),
      }))}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={address}
          icon={wallet?.icon}
        />
      )}
    />
  )
}
