import { ChakraProvider } from '@chakra-ui/react'
import { AptosWalletProvider } from '@components/wallets/Aptos'
import { SolanaWalletProvider } from '@components/wallets/Solana'
import { MainWalletBase, SignerOptions } from '@cosmos-kit/core'
import { wallets as cosmostationWallets } from '@cosmos-kit/cosmostation'
import { wallets as keplrWallets } from '@cosmos-kit/keplr'
import { wallets as leapWallets } from '@cosmos-kit/leap'
import { ChainProvider, noCssResetTheme } from '@cosmos-kit/react'
import { assets, chains } from 'chain-registry'
import { ConnectKitProvider, getDefaultConfig } from 'connectkit'
import type { AppProps } from 'next/app'
import { FC } from 'react'
import { WalletKitProvider as SuiWalletProvider } from '@mysten/wallet-kit'

import { Toaster } from 'react-hot-toast'
import { WagmiConfig, createConfig } from 'wagmi'

// Use require instead of import since order matters
require('../styles/globals.css')

const config = createConfig(
  getDefaultConfig({
    alchemyId: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: 'Pyth Network',
    appIcon: 'https://pyth.network/social-logo.png',
    autoConnect: false,
  })
)

const App: FC<AppProps> = ({ Component, pageProps }: AppProps) => {
  return (
    <SolanaWalletProvider>
      <AptosWalletProvider>
        <SuiWalletProvider>
          <WagmiConfig config={config}>
            <ConnectKitProvider>
              <ChakraProvider theme={noCssResetTheme}>
                <ChainProvider
                  chains={chains}
                  assetLists={assets}
                  wallets={
                    [
                      ...keplrWallets,
                      ...cosmostationWallets,
                      ...leapWallets,
                    ] as unknown as MainWalletBase[]
                  }
                  walletConnectOptions={{
                    signClient: {
                      projectId:
                        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
                      relayUrl: 'wss://relay.walletconnect.org',
                      metadata: {
                        name: 'Pyth Network',
                        description: 'Pyth Network',
                        url: 'https://pyth.network/',
                        icons: [],
                      },
                    },
                  }}
                  wrappedWithChakra={true}
                >
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
                </ChainProvider>
              </ChakraProvider>
            </ConnectKitProvider>
          </WagmiConfig>
        </SuiWalletProvider>
      </AptosWalletProvider>
    </SolanaWalletProvider>
  )
}

export default App
