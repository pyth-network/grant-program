import {
  AptosWalletAdapterProvider,
  Wallet,
  useWallet,
} from '@aptos-labs/wallet-adapter-react'
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import { ReactElement, ReactNode, useCallback, useMemo } from 'react'
import { WalletButton, WalletConnectedButton } from './WalletButton'
import { useAptosSignMessage } from 'hooks/useSignMessage'
import { SignButton } from './SignButton'
import { useTokenDispenserProvider } from 'hooks/useTokenDispenserProvider'
import { useAptosAddress } from 'hooks/useAddress'
import { Ecosystem } from '@components/Ecosystem'

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

type AptosWalletButtonProps = {
  disableOnConnect?: boolean
}
export function AptosWalletButton({
  disableOnConnect,
}: AptosWalletButtonProps) {
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
  const onSelect = useCallback(
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
        onSelect: () => onSelect(wallet),
      }))}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={address}
          icon={wallet?.icon}
          disabled={disableOnConnect}
        />
      )}
    />
  )
}

// A Solana wallet must be connected before this component is rendered
// If not this button will be disabled
export function AptosSignButton() {
  const signMessageFn = useAptosSignMessage()
  const tokenDispenser = useTokenDispenserProvider()
  const address = useAptosAddress()
  return (
    <SignButton
      signMessageFn={signMessageFn}
      message={tokenDispenser?.generateAuthorizationPayload()}
      solanaIdentity={tokenDispenser?.claimant.toBase58()}
      ecosystem={Ecosystem.APTOS}
      ecosystemIdentity={address}
    />
  )
}
