import { AptosWalletProvider } from '@components/wallets/Aptos'
import { SolanaWalletProvider } from '@components/wallets/Solana'
import type { AppProps } from 'next/app'
import { FC, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { WalletKitProvider as SuiWalletProvider } from '@mysten/wallet-kit'
import { NextSeo } from 'next-seo'
import { Toaster } from 'react-hot-toast'
import { EVMWalletProvider } from '@components/wallets/EVM'
import { CosmosWalletProvider } from '@components/wallets/Cosmos'
import { SessionProvider } from 'next-auth/react'
import { EcosystemProviders } from '@components/Ecosystem'

import '../styles/globals.css'
import { SeiProvider } from '@components/wallets/Sei'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Layout } from '@components/Layout'
import { Disclaimer } from '@components/modal/Disclaimer'
import Script from 'next/script'

import {
  DisclaimerCheckStore,
  PathnameStore,
  resetOnVersionMismatch,
} from 'utils/store'

function useRedirect() {
  // We are fetching it here and not in useEffect
  // As we need this before it is being reset
  const lastStep = useMemo(() => {
    return PathnameStore.get()
  }, [])

  const pathname = usePathname()
  const params = useSearchParams()

  const router = useRouter()
  // We will only redirect on the first load
  useLayoutEffect(() => {
    // These pathnames are being loaded when we have to oauth with Discord
    // We shouldn't be redirecting the user from these pages
    if (pathname === '/discord-login' || pathname === '/discord-logout') return

    //RULES:
    // 1. no last state -> redirect to welcome page
    // 2. there is a last state -> redirect to that page
    if (lastStep === null) router.replace('/')
    if (lastStep) router.replace(lastStep)
  }, [])

  useEffect(() => {
    // If the pathname for the current page is the once used for discord oauth,
    // don't store it.
    if (pathname === '/discord-login' || pathname === '/discord-logout') return
    else
      PathnameStore.set(
        `${pathname}${params.toString() ? '?' + params.toString() : ''}`
      )
  }, [params, pathname])
}

const App: FC<AppProps> = ({ Component, pageProps }: AppProps) => {
  // This should run before any rendering.
  // Clear any local state if mismatch
  resetOnVersionMismatch()

  const [disclaimerWasRead, setDisclaimerWasRead] = useState(false)

  // side effects on initial reload
  useLayoutEffect(() => {
    const wasRead = DisclaimerCheckStore.get()
    if (wasRead === 'true') setDisclaimerWasRead(true)
  }, [])

  useRedirect()
  return (
    <>
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-C2TFD85LKJ"
      />
      <Script id="google-tag">
        {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-C2TFD85LKJ');
  `}
      </Script>
      <SessionProvider>
        <SolanaWalletProvider>
          <AptosWalletProvider>
            <SuiWalletProvider>
              <EVMWalletProvider>
                <CosmosWalletProvider>
                  <SeiProvider>
                    {/* WARN: EcosystemProviders might use wallet provider addresses and hence
                 They should be inside all those providers. */}
                    <EcosystemProviders>
                      <Layout>
                        <NextSeo
                          title="Pyth Network Retrospective Airdrop"
                          description="This is the official claim webpage for the Pyth Network Retrospective Airdrop program."
                        />
                        <Component {...pageProps} />
                      </Layout>
                      <Toaster
                        position="bottom-left"
                        toastOptions={{
                          style: {
                            wordBreak: 'break-word',
                          },
                        }}
                        reverseOrder={false}
                      />
                      <Disclaimer
                        showModal={!disclaimerWasRead}
                        onAgree={() => {
                          DisclaimerCheckStore.set('true')
                          setDisclaimerWasRead(true)
                        }}
                      />
                    </EcosystemProviders>
                  </SeiProvider>
                </CosmosWalletProvider>
              </EVMWalletProvider>
            </SuiWalletProvider>
          </AptosWalletProvider>
        </SolanaWalletProvider>
      </SessionProvider>
    </>
  )
}

export default App
