import { DiscordSignButton } from './DiscordSignButton'
import { Ecosystem } from './Ecosystem'
import { AptosSignButton } from './wallets/Aptos'
import { CosmosSignButton } from './wallets/Cosmos'
import { EVMSignButton } from './wallets/EVM'
import { SolanaSignButton } from './wallets/Solana'
import { SuiSignButton } from './wallets/Sui'

// A wrapper around all the ecosystem sign buttons.
// It returns the relevant one based on the ecosystem prop.
export type EcosystemSignButtonProps = {
  ecosystem: Ecosystem
}
export function EcosystemSignButton({ ecosystem }: EcosystemSignButtonProps) {
  switch (ecosystem) {
    case Ecosystem.APTOS:
      return <AptosSignButton />
    case Ecosystem.EVM:
      return <EVMSignButton />
    case Ecosystem.INJECTIVE:
      return <CosmosSignButton chainName="injective" />
    case Ecosystem.NEUTRON:
      return <CosmosSignButton chainName="neutron" />
    case Ecosystem.OSMOSIS:
      return <CosmosSignButton chainName="osmosis" />
    case Ecosystem.SOLANA:
      return <SolanaSignButton />
    case Ecosystem.SUI:
      return <SuiSignButton />
    case Ecosystem.DISCORD:
      return <DiscordSignButton />
  }
}
