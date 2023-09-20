import {
  BackpackWalletAdapter,
  GlowWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets'

import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react'

import { useMemo, ReactElement, ReactNode, useCallback, useEffect } from 'react'
import { clusterApiUrl } from '@solana/web3.js'
import { Adapter, WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { Wallet, WalletButton, WalletConnectedButton } from './WalletButton'

export const PHANTOM_WALLET_ADAPTER = new PhantomWalletAdapter()
export const BACKPACK_WALLET_ADAPTER = new BackpackWalletAdapter()
export const SOLFLARE_WALLET_ADAPTER = new SolflareWalletAdapter()
export const OTHER_WALLETS = [
  new GlowWalletAdapter(),
  new TorusWalletAdapter(),
  new LedgerWalletAdapter(),
]

export function useSolanaWalletAdapters() {
  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded

  return useMemo(
    () => [
      PHANTOM_WALLET_ADAPTER,
      BACKPACK_WALLET_ADAPTER,
      SOLFLARE_WALLET_ADAPTER,
      ...OTHER_WALLETS,
    ],
    []
  )
}

type SolanaWalletProviderProps = {
  children: ReactNode
}
export function SolanaWalletProvider({
  children,
}: SolanaWalletProviderProps): ReactElement {
  const endpoint =
    process.env.ENDPOINT || clusterApiUrl(WalletAdapterNetwork.Devnet)

  const wallets = useSolanaWalletAdapters()

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}

// This hooks returns a function which can be used to select wallets.
// If the wallet is installed or is loadable (for ex, ledger), it will
// try to connect with it. Else, it will redirect the user to the wallet
// webpage.
export function useSelectWallet() {
  const { select } = useWallet()
  return useCallback(
    (walletAdapter: Adapter) => {
      if (
        walletAdapter.readyState === 'Installed' ||
        walletAdapter.readyState === 'Loadable'
      ) {
        select(walletAdapter.name)
      } else if (walletAdapter.readyState === 'NotDetected')
        window.open(walletAdapter.url, '_blank')
    },
    [select]
  )
}

// This hooks filters out the wallets which are unsupported.
// And transforms the supported ones into the generic `Wallet` type
export function useWallets(): Wallet[] {
  const { wallets } = useWallet()

  const onSelect = useSelectWallet()

  return useMemo(() => {
    return wallets
      .filter((wallet) => wallet.readyState !== 'Unsupported')
      .map((wallet) => ({
        name: wallet.adapter.name,
        onSelect: () => onSelect(wallet.adapter),
        icon: wallet.adapter.icon,
      }))
  }, [onSelect, wallets])
}

type SolanaWalletButtonProps = {
  disableOnConnect?: boolean
}
export function SolanaWalletButton({
  disableOnConnect,
}: SolanaWalletButtonProps) {
  const { publicKey, disconnect, connecting, connected, wallet } = useWallet()

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey])

  const wallets = useWallets()

  return (
    <WalletButton
      // address will only be used when connected is true
      address={base58}
      connected={connected}
      isLoading={connecting}
      wallets={wallets}
      walletConnectedButton={(address: string) => {
        return (
          <WalletConnectedButton
            onClick={disconnect}
            address={address}
            icon={wallet?.adapter.icon}
            disabled={disableOnConnect}
          />
        )
      }}
    />
  )
}
