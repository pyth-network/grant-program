import {
  AptosWalletAdapterProvider,
  useWallet,
} from '@aptos-labs/wallet-adapter-react'
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import { ReactElement, ReactNode, useMemo } from 'react'
import {
  WalletButton,
  WalletConnectedButton,
  WalletLoadingButton,
  WalletModalButton,
} from './Common'

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

  return (
    <WalletButton
      address={account?.address}
      connected={connected}
      isLoading={isLoading}
      walletModalButton={
        <WalletModalButton
          connect={connect}
          wallets={wallets.map((wallet) => ({
            icon: wallet.icon,
            name: wallet.name,
            connectId: wallet.name,
          }))}
        />
      }
      walletLoadingButton={<WalletLoadingButton />}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          disconnect={disconnect}
          address={address}
          icon={wallet?.icon}
        />
      )}
    />
  )
}
