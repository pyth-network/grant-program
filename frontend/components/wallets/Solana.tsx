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
import { WalletButton, WalletConnectedButton, WalletIcon } from './WalletButton'
import { Listbox, Transition } from '@headlessui/react'

import Down from '../../images/down.inline.svg'

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
      wallets={wallets.map((wallet) => ({
        name: wallet.adapter.name,
        connect: () => select(wallet.adapter.name),
        icon: wallet.adapter.icon,
      }))}
      walletConnectedButton={(address: string) => {
        if (toInstall === false)
          return (
            // connected will be true only when wallet is undefined
            <WalletConnectedButton
              onClick={disconnect}
              address={address}
              icon={wallet?.adapter.icon}
            />
          )
        else return <SolanaWalletDropdownButton />
      }}
    />
  )
}

export function SolanaWalletDropdownButton() {
  const { connect, disconnect, wallet } = useWallet()
  const options = useMemo(() => {
    return [
      { label: 'install', action: () => connect().catch(() => {}) },
      { label: 'disconnect', action: () => disconnect() },
    ]
  }, [connect, disconnect])

  return (
    <div className="relative z-10">
      <Listbox>
        {({ open }) => (
          <>
            <Listbox.Button
              className={`btn   min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light
          ${
            open
              ? 'border border-light-35 bg-darkGray1 hover:bg-light'
              : 'before:btn-bg btn--dark'
          }
          `}
            >
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                <WalletIcon icon={wallet?.adapter.icon} />
                <span>{wallet?.adapter.name}</span>
                <Down className={`${open ? 'rotate-180' : 'rotate-0'}`} />
              </span>
            </Listbox.Button>
            <Transition
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Listbox.Options className="absolute top-0  -mt-[1px] w-full divide-y divide-light-35 border border-light-35 bg-darkGray1">
                {options.map((option) => (
                  <Listbox.Option
                    key={option.label}
                    value={option.label}
                    className="flex cursor-pointer items-center  gap-2.5 py-3 px-6 hover:bg-darkGray3"
                    onClick={option.action}
                  >
                    {option.label}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </>
        )}
      </Listbox>
    </div>
  )
}
