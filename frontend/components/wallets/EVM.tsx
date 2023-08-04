import { ReactElement, ReactNode } from 'react'
import {
  WagmiConfig,
  createConfig,
  useAccount,
  useConnect,
  useDisconnect,
} from 'wagmi'
import { ConnectKitProvider, getDefaultConfig } from 'connectkit'
import { WalletButton, WalletConnectedButton } from './WalletButton'

const config = createConfig(
  getDefaultConfig({
    alchemyId: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: 'Pyth Network',
    appIcon: 'https://pyth.network/social-logo.png',
    autoConnect: false,
  })
)

type EVMWalletProviderProps = {
  children: ReactNode
}

export function EVMWalletProvider({
  children,
}: EVMWalletProviderProps): ReactElement {
  return (
    <WagmiConfig config={config}>
      <ConnectKitProvider>{children}</ConnectKitProvider>
    </WagmiConfig>
  )
}

export function EVMWalletButton() {
  const { disconnect } = useDisconnect()
  const { address, status, isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  return (
    <WalletButton
      address={address}
      connected={isConnected}
      isLoading={status === 'connecting' || status === 'reconnecting'}
      wallets={connectors.map((connector) => ({
        name: connector.name,
        connect: () => connect({ connector }),
      }))}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton onClick={disconnect} address={address} />
      )}
    />
  )
}
