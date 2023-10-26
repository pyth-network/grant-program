import { DiscordButton } from './DiscordButton'
import { Ecosystem } from './Ecosystem'
import { AptosWalletButton } from './wallets/Aptos'
import { CosmosWalletButton } from './wallets/Cosmos'
import { EVMWalletButton } from './wallets/EVM'
import { SeiWalletButton } from './wallets/Sei'
import { SolanaWalletButton } from './wallets/Solana'
import { SuiWalletButton } from './wallets/Sui'

// A wrapper around all the wallet connect buttons.
// It returns the relevant one based on the ecosystem prop.
export type EcosystemConnectButtonProps = {
  ecosystem: Ecosystem
  disableOnConnect?: boolean
}
export function EcosystemConnectButton({
  ecosystem,
  disableOnConnect,
}: EcosystemConnectButtonProps) {
  switch (ecosystem) {
    case Ecosystem.APTOS:
      return <AptosWalletButton disableOnConnect={disableOnConnect} />
    case Ecosystem.EVM:
      return <EVMWalletButton disableOnConnect={disableOnConnect} />
    case Ecosystem.INJECTIVE:
      return (
        <EVMWalletButton
          disableOnConnect={disableOnConnect}
          isInjective={true}
        />
      )
    case Ecosystem.NEUTRON:
      return (
        <CosmosWalletButton
          chainName="neutron"
          disableOnConnect={disableOnConnect}
        />
      )
    case Ecosystem.OSMOSIS:
      return (
        <CosmosWalletButton
          chainName="osmosis"
          disableOnConnect={disableOnConnect}
        />
      )
    case Ecosystem.SEI:
      return <SeiWalletButton />
    case Ecosystem.SOLANA:
      return <SolanaWalletButton disableOnConnect={disableOnConnect} />
    case Ecosystem.SUI:
      return <SuiWalletButton disableOnConnect={disableOnConnect} />
    case Ecosystem.DISCORD:
      return <DiscordButton disableOnAuth={disableOnConnect} />
  }
}
