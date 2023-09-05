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
import { SignButton } from './SignButton'
import { useEVMSignMessage } from 'hooks/useSignMessage'
import { useTokenDispenserProvider } from '@components/TokenDispenserProvider'
import { useEligiblity } from '@components/Ecosystem/EligibilityProvider'
import { useEVMAddress } from 'hooks/useAddress'

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

  const { eligibility, setEligibility } = useEligiblity()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (isConnected === true && address !== undefined) {
        // NOTE: we need to check if identity was previously stored
        // We can't check it using eligibility[address] === undefined
        // As, an undefined eligibility can be stored before.
        // Hence, we are checking if the key exists in the object
        if (address in eligibility) return
        else setEligibility(address, await fetchAmountAndProof('evm', address))
      }
    })()
  }, [isConnected, address, setEligibility, eligibility])

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

// A Solana wallet must be connected before this component is rendered
// If not this button will be disabled
export function EVMSignButton() {
  const signMessageFn = useEVMSignMessage()
  const tokenDispenser = useTokenDispenserProvider()
  const address = useEVMAddress()

  if (address === undefined || tokenDispenser === undefined)
    return <SignButton disable />
  else
    return (
      <SignButton
        signMessageFn={signMessageFn}
        message={tokenDispenser.generateAuthorizationPayload()}
        solanaIdentity={tokenDispenser.claimant.toBase58()}
        ecosystemIdentity={address}
      />
    )
}
