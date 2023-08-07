import { ChakraProvider } from '@chakra-ui/react'
import { AptosWalletProvider } from '@components/wallets/Aptos'
import { SolanaWalletProvider } from '@components/wallets/Solana'
import type { AppProps } from 'next/app'
import { FC } from 'react'
import { WalletKitProvider as SuiWalletProvider } from '@mysten/wallet-kit'

import { Toaster } from 'react-hot-toast'
import { EVMWalletProvider } from '@components/wallets/EVM'
import { CosmosWalletProvider } from '@components/wallets/Cosmos'

// Use require instead of import since order matters
require('../styles/globals.css')

const App: FC<AppProps> = ({ Component, pageProps }: AppProps) => {
  return (
    <SolanaWalletProvider>
      <AptosWalletProvider>
        <SuiWalletProvider>
          <EVMWalletProvider>
            <CosmosWalletProvider>
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
            </CosmosWalletProvider>
          </EVMWalletProvider>
        </SuiWalletProvider>
      </AptosWalletProvider>
    </SolanaWalletProvider>
  )
}

export default App
