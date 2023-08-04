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

import { useMemo, ReactElement, ReactNode } from 'react'
import { clusterApiUrl } from '@solana/web3.js'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  WalletButton,
  WalletConnectedButton,
  WalletLoadingButton,
  WalletModalButton,
} from './Common'

export const PHANTOM_WALLET_ADAPTER = new PhantomWalletAdapter()
export const BACKPACK_WALLET_ADAPTER = new BackpackWalletAdapter()
export const SOLFLARE_WALLET_ADAPTER = new SolflareWalletAdapter()
export const OTHER_WALLETS = [
  new GlowWalletAdapter(),
  new TorusWalletAdapter(),
  new LedgerWalletAdapter(),
  new SolletWalletAdapter(),
  new SolletExtensionWalletAdapter(),
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

export function SolanaWalletButton() {
  const {
    publicKey,
    disconnect,
    connecting,
    connected,
    select,
    wallets,
    wallet,
    connect,
  } = useWallet()

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey])

  // Wallet is not installed. Install it.
  const toInstall = useMemo(
    () => wallet?.adapter.readyState === 'NotDetected',
    [wallet?.adapter.readyState]
  )

  return (
    <WalletButton
      // address will only be used when connected or toInstall is true
      // if toInstall is true bas58 will be undefined
      address={base58 ?? 'install'}
      connected={connected || toInstall}
      isLoading={connecting}
      walletModalButton={
        <WalletModalButton
          connect={select}
          wallets={wallets.map((wallet) => ({
            name: wallet.adapter.name,
            connectId: wallet.adapter.name,
            icon: wallet.adapter.icon,
          }))}
        />
      }
      walletLoadingButton={<WalletLoadingButton />}
      walletConnectedButton={(address: string) => (
        // connected will be true only when wallet is undefined
        <WalletConnectedButton
          onClick={toInstall ? () => connect().catch(() => {}) : disconnect}
          address={address}
          icon={wallet?.adapter.icon}
          onHoverText={toInstall ? 'install' : 'disconnect'}
        />
      )}
    />
  )
}
