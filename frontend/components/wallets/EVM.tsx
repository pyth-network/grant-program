import { ReactElement, ReactNode, useCallback, useEffect } from 'react'
import {
  Connector,
  WagmiConfig,
  createConfig,
  useAccount,
  useConnect,
  useDisconnect,
  configureChains,
  mainnet,
} from 'wagmi'
import { WalletButton, WalletConnectedButton } from './WalletButton'

import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { fetchAmountAndProof } from 'utils/api'
import { Ecosystem, useEcosystem } from '@components/EcosystemProvider'
import { SignButton } from './SignButton'
import { useEVMSignMessage } from 'hooks/useSignMessage'

// Configure chains & providers with the Alchemy provider.
// Two popular providers are Alchemy (alchemy.com) and Infura (infura.io)
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY! }),
    publicProvider(),
  ]
)

// Set up wagmi config
const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'wagmi',
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
        showQrModal: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
})

type EVMWalletProviderProps = {
  children: ReactNode
}

export function EVMWalletProvider({
  children,
}: EVMWalletProviderProps): ReactElement {
  return <WagmiConfig config={config}> {children}</WagmiConfig>
}

type EvmWalletButtonProps = {
  disableOnConnect?: boolean
}
export function EVMWalletButton({ disableOnConnect }: EvmWalletButtonProps) {
  const { disconnect } = useDisconnect()
  const { address, status, isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  // If the wallet is connected or loadable, try to connect to it.
  // Else, redirect user to the wallet webpage.
  const onSelect = useCallback(
    (connector: Connector) => {
      if (connector.name === 'MetaMask') {
        if (window.ethereum.isMetaMask === true) connect({ connector })
        else window.open('https://metamask.io/download/', '_blank')
      } else {
        // Wallet flow is handled pretty well by coinbase and walletconnect.
        // We don't need to customize
        connect({ connector })
      }
    },
    [connect]
  )

  const { setEligibility, setSignedMessage } = useEcosystem()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (isConnected === true && address !== undefined) {
        const eligibility = await fetchAmountAndProof('evm', address)
        setEligibility(Ecosystem.EVM, eligibility)
      } else {
        setEligibility(Ecosystem.EVM, undefined)
      }
      // if the effect has been triggered again, it will only because of isConnected or address
      // i.e., the connected account has changed and hence set signedMessage to undefined
      setSignedMessage(Ecosystem.EVM, undefined)
    })()
  }, [isConnected, address, setEligibility, setSignedMessage])

  return (
    <WalletButton
      address={address}
      connected={isConnected}
      isLoading={status === 'connecting' || status === 'reconnecting'}
      wallets={connectors.map((connector) => ({
        name: connector.name,
        onSelect: () => onSelect(connector),
      }))}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={address}
          disabled={disableOnConnect}
        />
      )}
    />
  )
}

export function EVMSignButton() {
  const signMessageFn = useEVMSignMessage()
  // TODO: update this message
  return (
    <SignButton
      signMessageFn={signMessageFn}
      ecosystem={Ecosystem.EVM}
      message={'solana message'}
    />
  )
}
