import { AptosWalletProvider } from '@components/wallets/Aptos'
import { SolanaWalletProvider } from '@components/wallets/Solana'
import type { AppProps } from 'next/app'
import { FC, useEffect, useMemo } from 'react'
import { WalletKitProvider as SuiWalletProvider } from '@mysten/wallet-kit'

import { Toaster } from 'react-hot-toast'
import { EVMWalletProvider } from '@components/wallets/EVM'
import { CosmosWalletProvider } from '@components/wallets/Cosmos'
import { SessionProvider } from 'next-auth/react'
import { EcosystemProviders } from '@components/Ecosystem'

import '../styles/globals.css'
import { usePathname, useRouter } from 'next/navigation'

const LAST_STEP_STATUS_KEY = 'last-step-status-key'

function useRedirect() {
  // We are fetching it here and not in useEffect
  // As we need this before it is being reset
  const lastStep = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(LAST_STEP_STATUS_KEY)
  }, [])

  const router = useRouter()
  // We will only redirect on the first load
  useEffect(() => {
    //RULES:
    // 1. no last state -> redirect to welcome page
    // 2. there is a last state
    // 2a. If it is "/next-steps", user has claimed before, redirect to welcome page
    // 2b. Else redirect to that page.

    if (lastStep === null) router.replace('/')
    // NOTE: lastStep will never be /next-steps as we are not storing it in the useEffect
    // below.
    // The reason is that the below replace method doesn't work. No clue why.
    // This is a workaround for now.
    // if (lastStep === '/next-steps') router.replace('/')

    // lastStep will never be '/next-steps' for other redirect to them
    if (lastStep) router.replace(lastStep)
  }, [])

  const pathname = usePathname()
  useEffect(() => {
    if (pathname === '/next-steps')
      localStorage.removeItem(LAST_STEP_STATUS_KEY)
    else localStorage.setItem(LAST_STEP_STATUS_KEY, pathname)
  }, [pathname])
}

const App: FC<AppProps> = ({ Component, pageProps }: AppProps) => {
  useRedirect()
  return (
    <SessionProvider>
      <SolanaWalletProvider>
        <AptosWalletProvider>
          <SuiWalletProvider>
            <EVMWalletProvider>
              <CosmosWalletProvider>
                {/* WARN: EcosystemProviders might use wallet provider addresses and hence
                 They should be inside all those providers. */}
                <EcosystemProviders>
                  <Component {...pageProps} />
                  <Toaster
                    position="bottom-left"
                    toastOptions={{
                      style: {
                        wordBreak: 'break-word',
                      },
                    }}
                    reverseOrder={false}
                  />
                </EcosystemProviders>
              </CosmosWalletProvider>
            </EVMWalletProvider>
          </SuiWalletProvider>
        </AptosWalletProvider>
      </SolanaWalletProvider>
    </SessionProvider>
  )
}

export default App
