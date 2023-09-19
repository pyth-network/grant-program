import { AptosWalletProvider } from '@components/wallets/Aptos'
import { SolanaWalletProvider } from '@components/wallets/Solana'
import type { AppProps } from 'next/app'
import { FC, useEffect } from 'react'
import { WalletKitProvider as SuiWalletProvider } from '@mysten/wallet-kit'

import { Toaster } from 'react-hot-toast'
import { EVMWalletProvider } from '@components/wallets/EVM'
import { CosmosWalletProvider } from '@components/wallets/Cosmos'
import { SessionProvider } from 'next-auth/react'
import { EcosystemProviders } from '@components/Ecosystem'

import '../styles/globals.css'
import { useRouter } from 'next/router'
import { usePathname } from 'next/navigation'

const LAST_STEP_STATUS_KEY = 'last-step-status-key'

function useRedirect() {
  const router = useRouter()
  // We will only redirect on the first load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const lastStep = localStorage.getItem(LAST_STEP_STATUS_KEY)
    //RULES:
    // 1. no last state -> redirect to welcome page
    // 2. there is a last state
    // 2a. If it is "/next-steps", user has claimed before, redirect to welcome page
    // 2b. Else redirect to that page.
    if (lastStep === null) router.replace('/')
    if (lastStep === '/next-steps') router.replace('/')
    if (lastStep) router.replace(lastStep)
  }, [])

  const pathname = usePathname()
  useEffect(() => {
    localStorage.setItem(LAST_STEP_STATUS_KEY, pathname)
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
