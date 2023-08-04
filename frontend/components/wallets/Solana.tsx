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
  const { publicKey, disconnect, connecting, connected, select, wallets } =
    useWallet()

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey])

  return (
    <WalletButton
      address={base58}
      connected={connected}
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
        <WalletConnectedButton disconnect={disconnect} address={address} />
      )}
    />
  )
}
