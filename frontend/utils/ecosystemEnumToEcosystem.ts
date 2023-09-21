import { Ecosystem as EnumEcosystem } from '@components/Ecosystem'
import { Ecosystem as SdkEcosystem } from 'claim_sdk/claim'

export function enumToSdkEcosystem(ecosystem: EnumEcosystem): SdkEcosystem {
  switch (ecosystem) {
    case EnumEcosystem.APTOS:
      return 'aptos'
    case EnumEcosystem.EVM:
      return 'evm'
    case EnumEcosystem.INJECTIVE:
      return 'injective'
    case EnumEcosystem.NEUTRON:
      return 'cosmwasm'
    case EnumEcosystem.OSMOSIS:
      return 'cosmwasm'
    case EnumEcosystem.SEI:
      return 'cosmwasm'
    case EnumEcosystem.SOLANA:
      return 'solana'
    case EnumEcosystem.SUI:
      return 'sui'
    case EnumEcosystem.DISCORD:
      return 'discord'
  }
}
