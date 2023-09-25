import { Ecosystem } from '@components/Ecosystem'

// It returns the label to be shown in the table for the given ecosystem
export function getEcosystemTableLabel(ecosystem: Ecosystem) {
  switch (ecosystem) {
    case Ecosystem.APTOS:
      return 'Aptos activity'
    case Ecosystem.EVM:
      return 'EVM activity'
    case Ecosystem.INJECTIVE:
      return 'Injective activity'
    case Ecosystem.NEUTRON:
      return 'Neutron activity'
    case Ecosystem.OSMOSIS:
      return 'Osmosis activity'
    case Ecosystem.SEI:
      return 'Sei activity'
    case Ecosystem.SOLANA:
      return 'Solana activity'
    case Ecosystem.SUI:
      return 'Sui activity'
    case Ecosystem.DISCORD:
      return 'Discord activity'
  }
}
